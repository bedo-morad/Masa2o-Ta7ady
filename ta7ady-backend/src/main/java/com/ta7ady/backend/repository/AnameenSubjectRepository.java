package com.ta7ady.backend.repository;

import com.ta7ady.backend.entity.AnameenSubject;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnameenSubjectRepository extends JpaRepository<AnameenSubject, Long> {
    boolean existsByPlayerIgnoreCase(String player);

    @Query(value = "SELECT * FROM anameen_subjects ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<AnameenSubject> findRandom(@Param("count") int count);
}
