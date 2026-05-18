package rw.venus.geosmartmanager.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.config.AppProperties;
import rw.venus.geosmartmanager.entity.UserEntity;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class PasswordResetMailerService {
    private static final DateTimeFormatter EXPIRY_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm z", Locale.ENGLISH);

    private final JavaMailSender mailSender;
    private final AppProperties appProperties;

    public PasswordResetMailerService(JavaMailSender mailSender, AppProperties appProperties) {
        this.mailSender = mailSender;
        this.appProperties = appProperties;
    }

    public void sendResetEmail(UserEntity user, String resetLink, Instant expiresAt) {
        String fromAddress = normalize(appProperties.getMail().getFromAddress());
        if (fromAddress == null) {
            throw new IllegalStateException("Password reset email is not configured. Set APP_MAIL_FROM_ADDRESS and SMTP credentials.");
        }

        String expiryLabel = EXPIRY_FORMATTER.format(expiresAt.atZone(ZoneId.systemDefault()));
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;color:#203040;line-height:1.6">
                  <h2 style="margin-bottom:12px;color:#0D6B50;">GeoSmart Manager Password Reset</h2>
                  <p>Hello %s,</p>
                  <p>We received a request to reset your GeoSmart Manager password.</p>
                  <p>
                    <a href="%s" style="display:inline-block;padding:12px 18px;background:#0D6B50;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
                      Reset Password
                    </a>
                  </p>
                  <p>This link expires on <strong>%s</strong>.</p>
                  <p>If you did not request this reset, you can ignore this email.</p>
                </div>
                """.formatted(escapeHtml(user.getFullName()), escapeHtml(resetLink), escapeHtml(expiryLabel));

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject("GeoSmart Manager password reset");
            helper.setText(html, true);
            mailSender.send(message);
        } catch (MailAuthenticationException ex) {
            throw new IllegalStateException("SMTP authentication failed. Check the email app password and username.");
        } catch (MailException | jakarta.mail.MessagingException ex) {
            throw new IllegalStateException("Unable to send password reset email. Check the SMTP host, port, and app password.");
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
