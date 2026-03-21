package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.*;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;

@Path("/api/associations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AssociationResource {

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    JsonWebToken jwt;

    // -------------------------------------------------------------------------
    // DTOs
    // -------------------------------------------------------------------------

    public static class AssociationWithMembersDto {
        public Association association;
        public List<AssociationMembership> members;

        public AssociationWithMembersDto(Association association, List<AssociationMembership> members) {
            this.association = association;
            this.members = members;
        }
    }

    public static class RoleUpdateDto {
        public AssociationRole role;
    }

    public static class MyAssociationDto {
        public Association association;
        public AssociationMembership membership;

        public MyAssociationDto(Association association, AssociationMembership membership) {
            this.association = association;
            this.membership = membership;
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private User getAuthenticatedUser() {
        String keycloakId = jwt.getSubject();
        if (keycloakId == null) return null;
        return User.findByKeycloakId(keycloakId);
    }

    /**
     * Returns the membership if the given user is an APPROVED ADMIN of the association, otherwise null.
     */
    private AssociationMembership getAssociationAdminMembership(UUID associationId, UUID userId) {
        AssociationMembership m = AssociationMembership.findByAssociationIdAndUserId(associationId, userId);
        if (m != null && m.role == AssociationRole.ADMIN && m.status == MembershipStatus.APPROVED) {
            return m;
        }
        return null;
    }

    /**
     * Returns true if the given user is an APPROVED ADMIN or MODERATOR of the association.
     */
    private boolean isManagerOf(UUID associationId, UUID userId) {
        AssociationMembership m = AssociationMembership.findByAssociationIdAndUserId(associationId, userId);
        return m != null
                && (m.role == AssociationRole.ADMIN || m.role == AssociationRole.MODERATOR)
                && m.status == MembershipStatus.APPROVED;
    }

    // -------------------------------------------------------------------------
    // Endpoints
    // -------------------------------------------------------------------------

    /**
     * GET /api/associations/my — List associations the current user belongs to.
     */
    @GET
    @Path("/my")
    public Response listMyAssociations() {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        List<AssociationMembership> memberships = AssociationMembership.findByUserId(currentUser.id);
        List<MyAssociationDto> result = memberships.stream()
                .map(m -> new MyAssociationDto(Association.findById(m.associationId), m))
                .filter(dto -> dto.association != null)
                .toList();

        return Response.ok(result).build();
    }

    /**
     * GET /api/associations — List all associations (paginated, any authenticated user).
     */
    @GET
    public Response listAll(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        return Response.ok(PaginatedResponse.of(Association.findAll().page(page, size))).build();
    }

    /**
     * GET /api/associations/{id} — Get single association with its members.
     */
    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") UUID id) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Association association = Association.findById(id);
        if (association == null) return Response.status(Response.Status.NOT_FOUND).build();

        List<AssociationMembership> members = AssociationMembership.findByAssociationId(id);
        return Response.ok(new AssociationWithMembersDto(association, members)).build();
    }

    /**
     * POST /api/associations — Create association (any authenticated USER).
     * Creator is automatically assigned ADMIN + APPROVED membership.
     */
    @POST
    @Transactional
    public Response create(Association association) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        association.creatorId = currentUser.id;
        association.persist();

        AssociationMembership membership = new AssociationMembership();
        membership.associationId = association.id;
        membership.userId = currentUser.id;
        membership.role = AssociationRole.ADMIN;
        membership.status = MembershipStatus.APPROVED;
        membership.persist();

        return Response.status(Response.Status.CREATED).entity(association).build();
    }

    /**
     * PUT /api/associations/{id} — Update name and/or description.
     * Allowed: association ADMIN member OR system admin.
     */
    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, Association updatedAssociation) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Association association = Association.findById(id);
        if (association == null) return Response.status(Response.Status.NOT_FOUND).build();

        boolean isSystemAdmin = securityIdentity.hasRole(UserRole.ADMIN.name());
        boolean isAssociationAdmin = getAssociationAdminMembership(id, currentUser.id) != null;

        if (!isSystemAdmin && !isAssociationAdmin) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        if (updatedAssociation.name != null) association.name = updatedAssociation.name;
        if (updatedAssociation.description != null) association.description = updatedAssociation.description;
        // accentColor can be set to null to reset; always overwrite
        association.accentColor = updatedAssociation.accentColor;

        return Response.ok(association).build();
    }

    /**
     * PUT /api/associations/{id}/image — Upload association profile image (Admin only).
     */
    @PUT
    @Path("/{id}/image")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response uploadImage(
            @PathParam("id") UUID id,
            @org.jboss.resteasy.reactive.RestForm("image") org.jboss.resteasy.reactive.multipart.FileUpload fileUpload) {

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Association association = Association.findById(id);
        if (association == null) return Response.status(Response.Status.NOT_FOUND).build();

        if (getAssociationAdminMembership(id, currentUser.id) == null
                && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        try {
            byte[] fileBytes = Files.readAllBytes(fileUpload.uploadedFile());
            String contentType = fileUpload.contentType();
            if (contentType == null) contentType = "application/octet-stream";

            AssociationImage image = AssociationImage.findByAssociationId(id);
            if (image == null) {
                image = new AssociationImage();
                image.id = UUID.randomUUID();
                image.associationId = id;
            }
            image.data = fileBytes;
            image.contentType = contentType;
            image.persist();

            return Response.ok().build();
        } catch (IOException e) {
            return Response.serverError().entity("Failed to read uploaded file").build();
        }
    }

    /**
     * GET /api/associations/{id}/image — Get association profile image.
     */
    @GET
    @Path("/{id}/image")
    public Response getImage(@PathParam("id") UUID id) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        AssociationImage image = AssociationImage.findByAssociationId(id);
        if (image == null || image.data == null) {
            return Response.noContent().build();
        }
        return Response.ok(image.data).type(image.contentType).build();
    }

    /**
     * DELETE /api/associations/{id} — Delete association (creator or system admin).
     * Cascades delete of all memberships and the profile image.
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Association association = Association.findById(id);
        if (association == null) return Response.status(Response.Status.NOT_FOUND).build();

        boolean isCreator = association.creatorId.equals(currentUser.id);
        boolean isSystemAdmin = securityIdentity.hasRole(UserRole.ADMIN.name());

        if (!isCreator && !isSystemAdmin) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        AssociationMembership.delete("associationId", id);
        AssociationImage.delete("associationId", id);
        association.delete();

        return Response.noContent().build();
    }

    /**
     * GET /api/associations/{id}/members — List members with roles/statuses (paginated).
     */
    @GET
    @Path("/{id}/members")
    public Response listMembers(
            @PathParam("id") UUID id,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Association association = Association.findById(id);
        if (association == null) return Response.status(Response.Status.NOT_FOUND).build();

        return Response.ok(
            PaginatedResponse.of(
                AssociationMembership.find("associationId", id).page(page, size)
            )
        ).build();
    }

    /**
     * POST /api/associations/{id}/join — Request to join (creates PENDING membership).
     * Returns 409 if already a member or request pending.
     */
    @POST
    @Path("/{id}/join")
    @Transactional
    public Response join(@PathParam("id") UUID id) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Association association = Association.findById(id);
        if (association == null) return Response.status(Response.Status.NOT_FOUND).build();

        AssociationMembership existing = AssociationMembership.findByAssociationIdAndUserId(id, currentUser.id);
        if (existing != null) {
            return Response.status(Response.Status.CONFLICT)
                .entity("User is already a member or has a pending request")
                .build();
        }

        AssociationMembership membership = new AssociationMembership();
        membership.associationId = id;
        membership.userId = currentUser.id;
        membership.role = AssociationRole.MEMBER;
        membership.status = MembershipStatus.PENDING;
        membership.persist();

        return Response.status(Response.Status.CREATED).entity(membership).build();
    }

    /**
     * PUT /api/associations/{id}/members/{userId}/approve — Approve a PENDING membership.
     * Allowed: association ADMIN only.
     */
    @PUT
    @Path("/{id}/members/{userId}/approve")
    @Transactional
    public Response approveMember(@PathParam("id") UUID id, @PathParam("userId") UUID userId) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Association association = Association.findById(id);
        if (association == null) return Response.status(Response.Status.NOT_FOUND).build();

        if (!isManagerOf(id, currentUser.id)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        AssociationMembership membership = AssociationMembership.findByAssociationIdAndUserId(id, userId);
        if (membership == null) return Response.status(Response.Status.NOT_FOUND).build();

        if (membership.status == MembershipStatus.APPROVED) {
            return Response.status(Response.Status.CONFLICT)
                .entity("Membership is already approved")
                .build();
        }

        membership.status = MembershipStatus.APPROVED;
        return Response.ok(membership).build();
    }

    /**
     * PUT /api/associations/{id}/members/{userId}/role — Change member role.
     * Allowed: association ADMIN only.
     * Cannot demote if target is the only ADMIN.
     */
    @PUT
    @Path("/{id}/members/{userId}/role")
    @Transactional
    public Response changeMemberRole(
            @PathParam("id") UUID id,
            @PathParam("userId") UUID userId,
            RoleUpdateDto body) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Association association = Association.findById(id);
        if (association == null) return Response.status(Response.Status.NOT_FOUND).build();

        if (getAssociationAdminMembership(id, currentUser.id) == null) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        AssociationMembership membership = AssociationMembership.findByAssociationIdAndUserId(id, userId);
        if (membership == null) return Response.status(Response.Status.NOT_FOUND).build();

        if (membership.role == AssociationRole.ADMIN && body.role != AssociationRole.ADMIN) {
            long adminCount = AssociationMembership.count(
                "associationId = ?1 and role = ?2 and status = ?3",
                id, AssociationRole.ADMIN, MembershipStatus.APPROVED
            );
            if (adminCount <= 1) {
                return Response.status(Response.Status.CONFLICT)
                    .entity("Cannot demote the only admin of the association")
                    .build();
            }
        }

        membership.role = body.role;
        return Response.ok(membership).build();
    }

    /**
     * DELETE /api/associations/{id}/members/{userId} — Remove member.
     * Allowed: self-leave OR association ADMIN OR system admin.
     * Cannot remove the only ADMIN.
     */
    @DELETE
    @Path("/{id}/members/{userId}")
    @Transactional
    public Response removeMember(@PathParam("id") UUID id, @PathParam("userId") UUID userId) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Association association = Association.findById(id);
        if (association == null) return Response.status(Response.Status.NOT_FOUND).build();

        AssociationMembership membership = AssociationMembership.findByAssociationIdAndUserId(id, userId);
        if (membership == null) return Response.status(Response.Status.NOT_FOUND).build();

        boolean isSelf = userId.equals(currentUser.id);
        boolean isAssociationAdmin = getAssociationAdminMembership(id, currentUser.id) != null;
        boolean isSystemAdmin = securityIdentity.hasRole(UserRole.ADMIN.name());
        // Moderators can remove/reject only MEMBER-role users (pending or approved)
        AssociationMembership callerMembership = AssociationMembership.findByAssociationIdAndUserId(id, currentUser.id);
        boolean isModeratorRemovingMember = callerMembership != null
                && callerMembership.role == AssociationRole.MODERATOR
                && callerMembership.status == MembershipStatus.APPROVED
                && membership.role == AssociationRole.MEMBER;

        if (!isSelf && !isAssociationAdmin && !isSystemAdmin && !isModeratorRemovingMember) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        if (membership.role == AssociationRole.ADMIN && membership.status == MembershipStatus.APPROVED) {
            long adminCount = AssociationMembership.count(
                "associationId = ?1 and role = ?2 and status = ?3",
                id, AssociationRole.ADMIN, MembershipStatus.APPROVED
            );
            if (adminCount <= 1) {
                return Response.status(Response.Status.CONFLICT)
                    .entity("Cannot remove the only admin of the association")
                    .build();
            }
        }

        membership.delete();
        return Response.noContent().build();
    }
}
