package com.ta7ady.backend.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

// Delete-only admin gate (SPECV2 §2.2): stateless check of the shared password
// header against ${ADMIN_PASSWORD:admin}. No sessions, no JWT, no lockout.
@Component
public class AdminGate {
    private final String adminPassword;

    public AdminGate(@Value("${admin.password:${ADMIN_PASSWORD:admin}}") String adminPassword) {
        this.adminPassword = adminPassword;
    }

    public void requireAdmin(String provided) {
        if (provided == null || !provided.equals(adminPassword)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "wrong password");
        }
    }
}
