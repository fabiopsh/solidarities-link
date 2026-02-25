package it.soli.resource;

import java.util.List;

public class PaginatedResponse<T> {
    public List<T> data;
    public int page;
    public int size;
    public long totalElements;
    public int totalPages;

    public PaginatedResponse() {
    }

    public PaginatedResponse(List<T> data, int page, int size, long totalElements, int totalPages) {
        this.data = data;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
    }

    public static <T> PaginatedResponse<T> of(io.quarkus.hibernate.orm.panache.PanacheQuery<T> query) {
        return new PaginatedResponse<>(
            query.list(),
            query.page().index,
            query.page().size,
            query.count(),
            query.pageCount()
        );
    }
}
