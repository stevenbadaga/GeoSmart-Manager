package rw.venus.geosmartmanager.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class PdfBrandingSupport {
    private static final String LIGHT_LOGO_RESOURCE = "branding/geosmart-logo.png";
    private static final String DARK_LOGO_RESOURCE = "branding/geosmart-logo-dark.png";
    private static final String UI_FONT_REGULAR_RESOURCE = "branding/fonts/Manrope-Medium.ttf";
    private static final String UI_FONT_BOLD_RESOURCE = "branding/fonts/Manrope-ExtraBold.ttf";
    private static final String UI_FONT_FALLBACK_RESOURCE = "branding/fonts/Manrope-wght.ttf";
    private static final String WINDOWS_SERIF_REGULAR_FONT = "Fonts/times.ttf";
    private static final String WINDOWS_SERIF_BOLD_FONT = "Fonts/timesbd.ttf";

    private final byte[] lightLogoBytes;
    private final byte[] darkLogoBytes;
    private final byte[] uiRegularFontBytes;
    private final byte[] uiBoldFontBytes;
    private final byte[] uiFallbackFontBytes;
    private final byte[] serifFontBytes;
    private final byte[] serifBoldFontBytes;

    public PdfBrandingSupport() {
        this.lightLogoBytes = loadResourceBytes(LIGHT_LOGO_RESOURCE);
        this.darkLogoBytes = loadResourceBytes(DARK_LOGO_RESOURCE);
        this.uiRegularFontBytes = loadResourceBytes(UI_FONT_REGULAR_RESOURCE);
        this.uiBoldFontBytes = loadResourceBytes(UI_FONT_BOLD_RESOURCE);
        this.uiFallbackFontBytes = loadResourceBytes(UI_FONT_FALLBACK_RESOURCE);
        this.serifFontBytes = loadSystemFontBytes(WINDOWS_SERIF_REGULAR_FONT);
        this.serifBoldFontBytes = loadSystemFontBytes(WINDOWS_SERIF_BOLD_FONT);
    }

    public boolean hasLogo() {
        return hasLogo(LogoVariant.LIGHT);
    }

    public boolean hasLogo(LogoVariant variant) {
        return selectLogoBytes(variant).length > 0;
    }

    public float drawLogo(PDDocument document, PDPageContentStream content, float left, float top, float width) throws IOException {
        return drawLogo(document, content, left, top, width, LogoVariant.LIGHT);
    }

    public float drawLogo(PDDocument document,
                          PDPageContentStream content,
                          float left,
                          float top,
                          float width,
                          LogoVariant variant) throws IOException {
        byte[] logoBytes = selectLogoBytes(variant);
        if (logoBytes.length == 0) {
            return 0f;
        }

        PDImageXObject logo = PDImageXObject.createFromByteArray(document, logoBytes, "geosmart-logo");
        float height = width * ((float) logo.getHeight() / (float) logo.getWidth());
        content.drawImage(logo, left, top - height, width, height);
        return height;
    }

    public PdfFonts loadUiFonts(PDDocument document) throws IOException {
        PDFont regular = PDType1Font.HELVETICA;
        PDFont bold = PDType1Font.HELVETICA_BOLD;
        PDFont serifRegular = PDType1Font.TIMES_ROMAN;
        PDFont serifBold = PDType1Font.TIMES_BOLD;

        if (uiRegularFontBytes.length > 0) {
            regular = PDType0Font.load(document, new ByteArrayInputStream(uiRegularFontBytes), true);
        } else if (uiFallbackFontBytes.length > 0) {
            regular = PDType0Font.load(document, new ByteArrayInputStream(uiFallbackFontBytes), true);
        }

        if (uiBoldFontBytes.length > 0) {
            bold = PDType0Font.load(document, new ByteArrayInputStream(uiBoldFontBytes), true);
        } else if (uiFallbackFontBytes.length > 0) {
            bold = PDType0Font.load(document, new ByteArrayInputStream(uiFallbackFontBytes), true);
        }

        if (serifFontBytes.length > 0) {
            serifRegular = PDType0Font.load(document, new ByteArrayInputStream(serifFontBytes), true);
        }
        if (serifBoldFontBytes.length > 0) {
            serifBold = PDType0Font.load(document, new ByteArrayInputStream(serifBoldFontBytes), true);
        }
        return new PdfFonts(regular, bold, serifRegular, serifBold);
    }

    private byte[] selectLogoBytes(LogoVariant variant) {
        return variant == LogoVariant.DARK ? darkLogoBytes : lightLogoBytes;
    }

    private byte[] loadResourceBytes(String resourcePath) {
        ClassPathResource resource = new ClassPathResource(resourcePath);
        if (!resource.exists()) {
            return new byte[0];
        }

        try (InputStream inputStream = resource.getInputStream()) {
            return inputStream.readAllBytes();
        } catch (IOException ex) {
            return new byte[0];
        }
    }

    private byte[] loadSystemFontBytes(String relativeWindowsFontPath) {
        String windowsDir = System.getenv("WINDIR");
        if (windowsDir == null || windowsDir.isBlank()) {
            return new byte[0];
        }

        Path fontPath = Path.of(windowsDir, relativeWindowsFontPath);
        if (!Files.exists(fontPath)) {
            return new byte[0];
        }

        try {
            return Files.readAllBytes(fontPath);
        } catch (IOException ex) {
            return new byte[0];
        }
    }

    public enum LogoVariant {
        LIGHT,
        DARK
    }

    public record PdfFonts(PDFont regular, PDFont bold, PDFont serifRegular, PDFont serifBold) {}
}
