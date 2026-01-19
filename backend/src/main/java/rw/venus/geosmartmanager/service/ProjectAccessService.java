package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.domain.ProjectMemberRole;
import rw.venus.geosmartmanager.domain.UserRole;
import rw.venus.geosmartmanager.entity.ProjectMemberEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ProjectMemberRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ProjectAccessService {
    private final ProjectMemberRepository projectMemberRepository;

    public ProjectAccessService(ProjectMemberRepository projectMemberRepository) {
        this.projectMemberRepository = projectMemberRepository;
    }

    public void requireProjectRead(UserEntity actor, UUID projectId) {
        if (actor.getRole() == UserRole.ADMIN) {
            return;
        }
        if (!projectMemberRepository.existsByProjectIdAndUserId(projectId, actor.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have access to this project");
        }
    }

    public void requireProjectWrite(UserEntity actor, UUID projectId) {
        if (actor.getRole() == UserRole.ADMIN) {
            return;
        }
        ProjectMemberEntity member = projectMemberRepository.findByProjectIdAndUserId(projectId, actor.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have access to this project"));
        if (member.getRole() == ProjectMemberRole.VIEWER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have permission to modify this project");
        }
    }

    public void requireProjectAdmin(UserEntity actor, UUID projectId) {
        if (actor.getRole() == UserRole.ADMIN) {
            return;
        }
        ProjectMemberEntity member = projectMemberRepository.findByProjectIdAndUserId(projectId, actor.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have access to this project"));
        if (member.getRole() != ProjectMemberRole.PROJECT_ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have permission to manage this project");
        }
    }
}

