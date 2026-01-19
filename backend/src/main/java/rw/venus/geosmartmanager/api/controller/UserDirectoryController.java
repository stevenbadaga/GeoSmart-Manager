package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.WorkflowDtos;
import rw.venus.geosmartmanager.api.dto.UserDtos;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.ProjectAccessService;
import rw.venus.geosmartmanager.service.WorkflowTaskService;
import rw.venus.geosmartmanager.repo.UserRepository;
import rw.venus.geosmartmanager.entity.UserEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class UserDirectoryController {
    private final WorkflowTaskService workflowTaskService;
    private final CurrentUserService currentUserService;
    private final ProjectAccessService projectAccessService;
    private final UserRepository userRepository;

    public UserDirectoryController(
            WorkflowTaskService workflowTaskService,
            CurrentUserService currentUserService,
            ProjectAccessService projectAccessService,
            UserRepository userRepository
    ) {
        this.workflowTaskService = workflowTaskService;
        this.currentUserService = currentUserService;
        this.projectAccessService = projectAccessService;
        this.userRepository = userRepository;
    }

    @GetMapping("/projects/{projectId}/assignable-users")
    public List<WorkflowDtos.AssignableUserDto> assignableUsers(@PathVariable UUID projectId) {
        return workflowTaskService.listAssignableUsers(currentUserService.requireCurrentUser(), projectId);
    }

    @GetMapping("/projects/{projectId}/user-directory")
    public List<UserDtos.DirectoryUserDto> userDirectory(@PathVariable UUID projectId, @RequestParam(required = false) String q) {
        UserEntity actor = currentUserService.requireCurrentUser();
        projectAccessService.requireProjectAdmin(actor, projectId);

        String query = q == null ? "" : q.trim().toLowerCase();
        return userRepository.findAll().stream()
                .filter(UserEntity::isEnabled)
                .filter(u -> query.isBlank()
                        || (u.getUsername() != null && u.getUsername().toLowerCase().contains(query))
                        || (u.getEmail() != null && u.getEmail().toLowerCase().contains(query)))
                .map(u -> new UserDtos.DirectoryUserDto(u.getId(), u.getUsername(), u.getEmail(), u.getRole()))
                .toList();
    }
}
