package rw.venus.geosmartmanager.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.config.AppProperties;

@Service
public class EmailNotificationService {
    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);

    private final JavaMailSender mailSender;
    private final AppProperties appProperties;

    public EmailNotificationService(JavaMailSender mailSender, AppProperties appProperties) {
        this.mailSender = mailSender;
        this.appProperties = appProperties;
    }

    private void sendEmail(String to, String subject, String body) {
        String fromAddress = appProperties.getMail().getFromAddress();
        if (fromAddress == null || fromAddress.isBlank()) {
            log.warn("Email sending skipped: From address not configured.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
            log.info("Email sent successfully to {}", to);
        } catch (Exception ex) {
            log.warn("Failed to send email to {}: {}", to, ex.getMessage());
        }
    }

    public void notifyAdmin(String subject, String body) {
        sendEmail(appProperties.getMail().getFromAddress(), subject, body);
    }

    @Async("notificationTaskExecutor")
    public void notifyNewProject(String adminEmail, String projectName) {
        String body = "<h1>New Project Submitted</h1><p>A new project has been submitted: <b>" + projectName + "</b></p><p>Please log in to the admin dashboard to review and assign it.</p>";
        sendEmail(adminEmail, "New Project Submitted", body);
    }

    @Async("notificationTaskExecutor")
    public void notifyProjectAssigned(String surveyorEmail, String projectName) {
        String body = "<h1>Project Assigned to You</h1><p>You have been assigned to project: <b>" + projectName + "</b></p><p>Please log in to your dashboard to begin the review.</p>";
        sendEmail(surveyorEmail, "Project Assigned to You", body);
    }

    @Async("notificationTaskExecutor")
    public void notifyStatusChanged(String recipientEmail, String projectName, String status) {
        String body = "<h1>Project Status Updated</h1><p>The status of project <b>" + projectName + "</b> has changed to: <b>" + status + "</b></p>";
        sendEmail(recipientEmail, "Project Status Updated", body);
    }

    @Async("notificationTaskExecutor")
    public void notifyReportGenerated(String recipientEmail, String projectName) {
        String body = "<h1>Report Available</h1><p>A new planning report is available for project: <b>" + projectName + "</b></p><p>You can download it from your dashboard.</p>";
        sendEmail(recipientEmail, "Report Available", body);
    }

    @Async("notificationTaskExecutor")
    public void notifyNewContactMessage(String adminEmail, String senderName, String subjectText) {
        String body = "<h1>New Contact Message</h1><p>From: <b>" + senderName + "</b></p><p>Subject: " + subjectText + "</p><p>Check the admin dashboard for details.</p>";
        sendEmail(adminEmail, "New Contact Message", body);
    }
}
