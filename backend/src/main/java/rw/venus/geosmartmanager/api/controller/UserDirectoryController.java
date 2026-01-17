package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.WorkflowDtos;
import rw.venus.geosmartmanager.service.WorkflowTaskService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserDirectoryController {
    private final WorkflowTaskService workflowTaskService;

    public UserDirectoryController(WorkflowTaskService workflowTaskService) {
        this.workflowTaskService = workflowTaskService;
    }

    @GetMapping("/assignable")
    public List<WorkflowDtos.AssignableUserDto> assignableUsers() {
        return workflowTaskService.listAssignableUsers();
    }
}

