package com.studysync.security;

import com.studysync.model.UserRole;

public interface RoleAwareUserDetails {
    String getEntityId();
    UserRole getRoleEnum();
}
