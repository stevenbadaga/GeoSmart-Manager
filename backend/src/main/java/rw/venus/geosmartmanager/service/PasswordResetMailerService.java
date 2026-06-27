package rw.venus.geosmartmanager.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
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
    private final String configuredMailUsername;
    private final String configuredMailPassword;

    public PasswordResetMailerService(JavaMailSender mailSender,
                                      AppProperties appProperties,
                                      @Value("${GEOSMART_MAIL_USERNAME:}") String configuredMailUsername,
                                      @Value("${GEOSMART_MAIL_APP_PASSWORD:}") String configuredMailPassword) {
        this.mailSender = mailSender;
        this.appProperties = appProperties;
        this.configuredMailUsername = configuredMailUsername;
        this.configuredMailPassword = configuredMailPassword;
    }

    public boolean isEmailDeliveryConfigured() {
        return normalize(appProperties.getMail().getFromAddress()) != null
                && normalize(configuredMailUsername) != null
                && normalize(configuredMailPassword) != null;
    }

    public void sendResetEmail(UserEntity user, String resetLink, Instant expiresAt) {
        String fromAddress = normalize(appProperties.getMail().getFromAddress());
        if (fromAddress == null) {
            throw new IllegalStateException("Password reset email is not configured. Set APP_MAIL_FROM_ADDRESS and SMTP credentials.");
        }

        String expiryLabel = EXPIRY_FORMATTER.format(expiresAt.atZone(ZoneId.systemDefault()));
        String escapedName = escapeHtml(user.getFullName());
        String escapedResetLink = escapeHtml(resetLink);
        String escapedExpiryLabel = escapeHtml(expiryLabel);
        String text = """
                GeoSmart Manager password reset

                Hello %s,

                We received a request to reset the password for your GeoSmart Manager account.

                Reset your password:
                %s

                This link expires on %s. If you did not request this reset, you can safely ignore this email.

                GeoSmart Manager
                Land Intelligence Platform
                """.formatted(user.getFullName(), resetLink, expiryLabel);
        String html = """
                <!doctype html>
                <html lang="en">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Reset your GeoSmart Manager password</title>
                  </head>
                  <body style="margin:0;padding:0;background:#f4f7f6;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;">
                    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
                      Use this secure link to reset your GeoSmart Manager password.
                    </span>
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f4f7f6;margin:0;padding:32px 16px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe7e3;border-radius:14px;overflow:hidden;box-shadow:0 16px 40px rgba(15,23,42,0.08);">
                            <tr>
                              <td style="background:#0d6b50;padding:28px 32px;color:#ffffff;">
                                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="width:48px;">
                                      <div style="width:44px;height:44px;border-radius:10px;background:#ffffff;color:#0d6b50;line-height:44px;text-align:center;font-size:20px;font-weight:700;">G</div>
                                    </td>
                                    <td style="padding-left:14px;">
                                      <div style="font-size:20px;font-weight:700;line-height:1.2;">GeoSmart Manager</div>
                                      <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;opacity:0.82;margin-top:4px;">Land Intelligence Platform</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:36px 32px 14px;">
                                <div style="font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#0d6b50;margin-bottom:12px;">Password reset request</div>
                                <h1 style="margin:0;color:#1f2937;font-size:28px;line-height:1.25;font-weight:700;">Reset your password</h1>
                                <p style="margin:18px 0 0;color:#4b5563;font-size:15px;line-height:1.7;">Hello %s,</p>
                                <p style="margin:10px 0 0;color:#4b5563;font-size:15px;line-height:1.7;">We received a request to reset the password for your GeoSmart Manager account. Use the secure button below to choose a new password.</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:18px 32px 8px;">
                                <a href="%s" style="display:inline-block;background:#0d6b50;color:#ffffff;text-decoration:none;border-radius:8px;padding:14px 22px;font-size:15px;font-weight:700;">Reset password</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:18px 32px 0;">
                                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f7faf9;border:1px solid #dbe7e2;border-radius:10px;">
                                  <tr>
                                    <td style="padding:16px 18px;">
                                      <div style="font-size:13px;font-weight:700;color:#1f2937;margin-bottom:6px;">Security notice</div>
                                      <div style="font-size:14px;line-height:1.6;color:#5b6673;">This link expires on <strong style="color:#1f2937;">%s</strong>. If you did not request this reset, you can ignore this email and your password will remain unchanged.</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:22px 32px 34px;">
                                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">If the button does not work, paste this link into your browser:</p>
                                <p style="margin:8px 0 0;word-break:break-all;color:#0d6b50;font-size:13px;line-height:1.6;"><a href="%s" style="color:#0d6b50;text-decoration:underline;">%s</a></p>
                              </td>
                            </tr>
                          </table>
                          <p style="max-width:620px;margin:18px auto 0;color:#7a8491;font-size:12px;line-height:1.6;text-align:center;">This message was sent by GeoSmart Manager for account security. Please do not reply to this email.</p>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(escapedName, escapedResetLink, escapedExpiryLabel, escapedResetLink, escapedResetLink);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject("Reset your GeoSmart Manager password");
            helper.setText(text, html);
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
