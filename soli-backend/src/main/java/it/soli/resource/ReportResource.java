package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import it.soli.entity.Report;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

@Path("/api/reports")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReportResource {

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    JsonWebToken jwt;

    private User getAuthenticatedUser() {
        String keycloakId = jwt.getSubject();
        if (keycloakId == null) return null;
        return User.findByKeycloakId(keycloakId);
    }

    @GET
    @RolesAllowed({"ADMIN"})
    public PaginatedResponse<Report> listAll(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return PaginatedResponse.of(Report.findAll().page(page, size));
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") UUID id) {
        Report report = Report.findById(id);
        if (report == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (!report.reporterId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        return Response.ok(report).build();
    }

    @POST
    @Transactional
    public Response create(Report report) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (report.reporterId == null) {
            report.reporterId = currentUser.id;
        }

        if (!report.reporterId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        report.persist();
        return Response.status(Response.Status.CREATED).entity(report).build();
    }

    @PUT
    @Path("/{id}/status")
    @Transactional
    @RolesAllowed({"ADMIN"})
    public Response updateStatus(@PathParam("id") UUID id, Report updatedReport) {
        Report report = Report.findById(id);
        if (report == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        report.status = updatedReport.status;
        report.resolvedAt = LocalDateTime.now(); // Simplified, in reality check if status is RESOLVED/DISMISSED

        return Response.ok(report).build();
    }
}
