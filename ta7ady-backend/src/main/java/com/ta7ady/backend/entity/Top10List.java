package com.ta7ady.backend.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "top10_lists")
@Getter
@Setter
@NoArgsConstructor
public class Top10List {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prompt", nullable = false)
    private String prompt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "top10_list_answers", joinColumns = @JoinColumn(name = "list_id"))
    @OrderColumn(name = "answer_order")
    @Column(name = "answer", nullable = false)
    private List<String> answers = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
