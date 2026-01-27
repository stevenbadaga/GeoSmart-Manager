package rw.venus.geosmartmanager.security;

import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class TotpService {
    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom RNG = new SecureRandom();

    public String generateBase32Secret() {
        byte[] bytes = new byte[20];
        RNG.nextBytes(bytes);
        return base32Encode(bytes);
    }

    public String buildOtpAuthUrl(String issuer, String username, String base32Secret) {
        String label = issuer + ":" + username;
        String encLabel = URLEncoder.encode(label, StandardCharsets.UTF_8);
        String encIssuer = URLEncoder.encode(issuer, StandardCharsets.UTF_8);
        return "otpauth://totp/" + encLabel
                + "?secret=" + base32Secret
                + "&issuer=" + encIssuer
                + "&algorithm=SHA1&digits=6&period=30";
    }

    public boolean verifyCode(String base32Secret, String code) {
        if (base32Secret == null || base32Secret.isBlank()) {
            return false;
        }
        if (code == null || code.isBlank()) {
            return false;
        }
        String normalized = code.replace(" ", "").trim();
        if (!normalized.matches("\\d{6}")) {
            return false;
        }
        int provided = Integer.parseInt(normalized);

        byte[] secret = base32Decode(base32Secret);
        long nowStep = Instant.now().getEpochSecond() / 30;
        for (long step = nowStep - 1; step <= nowStep + 1; step++) {
            int expected = totp(secret, step);
            if (expected == provided) {
                return true;
            }
        }
        return false;
    }

    private int totp(byte[] secret, long step) {
        try {
            byte[] counter = ByteBuffer.allocate(8).putLong(step).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(secret, "HmacSHA1"));
            byte[] hash = mac.doFinal(counter);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);
            return binary % 1_000_000;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to compute TOTP", ex);
        }
    }

    private String base32Encode(byte[] data) {
        StringBuilder out = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = 0;
        int bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                int idx = (buffer >> (bitsLeft - 5)) & 0x1F;
                bitsLeft -= 5;
                out.append(BASE32_ALPHABET.charAt(idx));
            }
        }
        if (bitsLeft > 0) {
            int idx = (buffer << (5 - bitsLeft)) & 0x1F;
            out.append(BASE32_ALPHABET.charAt(idx));
        }
        return out.toString();
    }

    private byte[] base32Decode(String base32) {
        String s = base32.trim().replace("=", "").replace(" ", "").toUpperCase(Locale.ROOT);
        ByteBuffer out = ByteBuffer.allocate((s.length() * 5) / 8 + 8);
        int buffer = 0;
        int bitsLeft = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            int val = BASE32_ALPHABET.indexOf(c);
            if (val < 0) {
                continue;
            }
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out.put((byte) ((buffer >> (bitsLeft - 8)) & 0xFF));
                bitsLeft -= 8;
            }
        }
        out.flip();
        byte[] bytes = new byte[out.remaining()];
        out.get(bytes);
        return bytes;
    }
}

