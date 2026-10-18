package com.ta7ady.backend.repository;

import com.ta7ady.backend.entity.WhoPicturePhoto;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WhoPicturePhotoRepository extends JpaRepository<WhoPicturePhoto, Long> {
    // One photo is a full game (SPECV4 §4.3); count clamps to 1–5 in the service.
    @Query(value = "SELECT * FROM whopicture_photos ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<WhoPicturePhoto> findRandom(@Param("count") int count);
}
