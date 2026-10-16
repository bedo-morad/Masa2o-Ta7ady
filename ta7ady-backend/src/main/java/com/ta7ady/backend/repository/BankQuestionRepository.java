package com.ta7ady.backend.repository;

import com.ta7ady.backend.entity.BankQuestion;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BankQuestionRepository extends JpaRepository<BankQuestion, Long> {
    @Query(value = "SELECT * FROM bank_questions ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<BankQuestion> findRandom(@Param("count") int count);
}
