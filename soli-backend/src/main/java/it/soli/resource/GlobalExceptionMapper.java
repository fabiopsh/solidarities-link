package it.soli.resource;

import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import jakarta.ws.rs.core.Response;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.Date;

@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Throwable> {
    @Override
    public Response toResponse(Throwable exception) {
        try {
            FileWriter fw = new FileWriter("target/manual-error.log", true);
            PrintWriter pw = new PrintWriter(fw);
            pw.println("====== EXCEPTION AT " + new Date() + " ======");
            exception.printStackTrace(pw);
            pw.println();
            pw.close();
        } catch (Exception ex) {}
        
        // Risposta generica o stack trace
        return Response.status(500).entity(exception.getMessage() + "\n" + exception.toString()).build();
    }
}
