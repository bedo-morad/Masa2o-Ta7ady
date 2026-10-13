package com.ta7ady.backend.repository;

import com.ta7ady.backend.entity.PlayerName;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlayerNameRepository extends JpaRepository<PlayerName, Long> {
    boolean existsByPlayerNameIgnoreCase(String playerName);

    @Query(value = "SELECT * FROM player_names ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<PlayerName> findRandom(@Param("count") int count);
}
