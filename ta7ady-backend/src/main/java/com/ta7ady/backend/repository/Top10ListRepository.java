package com.ta7ady.backend.repository;

import com.ta7ady.backend.entity.Top10List;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface Top10ListRepository extends JpaRepository<Top10List, Long> {
    @Query(value = "SELECT * FROM top10_lists ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<Top10List> findRandom(@Param("count") int count);
}
