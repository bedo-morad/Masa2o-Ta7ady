package com.ta7ady.backend.repository;

import com.ta7ady.backend.entity.IhbidQuestion;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IhbidQuestionRepository extends JpaRepository<IhbidQuestion, Long> {
    @Query(value = "SELECT * FROM ihbid_questions ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<IhbidQuestion> findRandom(@Param("count") int count);
}
