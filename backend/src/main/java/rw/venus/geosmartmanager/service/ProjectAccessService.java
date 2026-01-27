package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.domain.ProjectMemberRole;
import rw.venus.geosmartmanager.domain.UserRole;
import rw.venus.geosmartmanager.entity.ProjectMemberEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ProjectMemberRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ProjectAccessService {
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;

    public ProjectAccessService(ProjectMemberRepository projectMemberRepository, ProjectRepository projectRepository) {
        this.projectMemberRepository = projectMemberRepository;
        this.projectRepository = projectRepository;
    }

    public void requireProjectRead(UserEntity actor, UUID projectId) {
        if (actor.getRole() == UserRole.ADMIN) {
            return;
        }
        if (actor.getRole() == UserRole.CLIENT) {
            if (!projectRepository.existsByIdAndClient_User_Id(projectId, actor.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have access to this project");
            }
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
        if (actor.getRole() == UserRole.CLIENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Clients cannot modify projects");
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
        if (actor.getRole() == UserRole.CLIENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Clients cannot manage projects");
        }
        ProjectMemberEntity member = projectMemberRepository.findByProjectIdAndUserId(projectId, actor.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have access to this project"));
        if (member.getRole() != ProjectMemberRole.PROJECT_ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have permission to manage this project");
        }
    }
}
