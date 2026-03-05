package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.Reward;
import jakarta.annotation.security.RolesAllowed;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/rewards")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RewardResource {

    @GET
    public PaginatedResponse<Reward> listAllActive(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return PaginatedResponse.of(Reward.find("isActive", true).page(page, size));
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") UUID id) {
        Reward reward = Reward.findById(id);
        if (reward == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(reward).build();
    }

    @POST
    @Transactional
    @RolesAllowed({"ADMIN"})
    public Response create(Reward reward) {
        reward.persist();
        return Response.status(Response.Status.CREATED).entity(reward).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @RolesAllowed({"ADMIN"})
    public Response update(@PathParam("id") UUID id, Reward updatedReward) {
        Reward reward = Reward.findById(id);
        if (reward == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        reward.title = updatedReward.title;
        reward.description = updatedReward.description;
        reward.costInCredits = updatedReward.costInCredits;
        reward.partnerName = updatedReward.partnerName;
        reward.stockLimit = updatedReward.stockLimit;
        reward.isActive = updatedReward.isActive;

        return Response.ok(reward).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @RolesAllowed({"ADMIN"})
    public Response delete(@PathParam("id") UUID id) {
        Reward reward = Reward.findById(id);
        if (reward == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        reward.delete();
        return Response.noContent().build();
    }
}
