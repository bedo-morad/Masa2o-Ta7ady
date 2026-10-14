package com.ta7ady.backend.repository;

import com.ta7ady.backend.entity.ScoresheetMatch;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ScoresheetMatchRepository extends JpaRepository<ScoresheetMatch, Long> {
    @Query(value = "SELECT * FROM scoresheet_matches ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<ScoresheetMatch> findRandom(@Param("count") int count);
}
