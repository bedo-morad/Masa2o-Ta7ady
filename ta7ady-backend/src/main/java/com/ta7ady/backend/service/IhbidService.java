package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.IhbidQuestion;
import com.ta7ady.backend.repository.IhbidQuestionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class IhbidService {
    private final IhbidQuestionRepository repo;

    public List<IhbidQuestion> random10() {
        return repo.findRandom(10);
    }

    public List<IhbidQuestion> random(int count) {
        return repo.findRandom(normalizeCount(count));
    }

    private int normalizeCount(int count) {
        if (count < 1) return 1;
        if (count > 50) return 50;
        return count;
    }

    public Page<IhbidQuestion> all(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public IhbidQuestion create(String question, String answer) {
        String q = question == null ? "" : question.trim();
        String a = answer == null ? "" : answer.trim();
        if (q.length() < 3 || a.length() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "question must be >=3 chars and answer must not be empty");
        }
        IhbidQuestion e = new IhbidQuestion();
        e.setQuestionText(q);
        e.setAnswerText(a);
        return repo.save(e);
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }
}
