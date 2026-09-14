package com.acme.lightwell.web;

import com.acme.lightwell.demo.VulnerabilityCatalog;
import org.apache.commons.text.StringSubstitutor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ACME Order Hub APIs. Business logic is intentionally minimal so demos focus on
 * pinned dependencies; Lightwell remediates Spring via version suffix + repo URL only.
 */
@RestController
public class OrderController {

    private final String buildProfile;
    private final String springFrameworkVersion;
    private final String jacksonVersion;
    private final String commonsTextVersion;

    public OrderController(
            @Value("${lightwell.build.profile}") String buildProfile,
            @Value("${lightwell.spring-framework.version}") String springFrameworkVersion,
            @Value("${lightwell.jackson.version}") String jacksonVersion,
            @Value("${lightwell.commons-text.version}") String commonsTextVersion) {
        this.buildProfile = buildProfile;
        this.springFrameworkVersion = springFrameworkVersion;
        this.jacksonVersion = jacksonVersion;
        this.commonsTextVersion = commonsTextVersion;
    }

    @PostMapping(path = "/api/orders", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> createOrder(@RequestBody OrderRequest request) {
        Map<String, String> values = new HashMap<>();
        values.put("name", safe(request.getCustomerName(), "Customer"));
        values.put("id", safe(request.getOrderId(), "0000"));

        String template = "Hello ${name}, order #${id} is processing.";
        String statusMessage = new StringSubstitutor(values).replace(template);
        if (request.getNote() != null && !request.getNote().isBlank()) {
            statusMessage = statusMessage + " Note: " + request.getNote().trim();
        }

        Map<String, Object> order = new LinkedHashMap<>();
        order.put("customerName", values.get("name"));
        order.put("orderId", values.get("id"));
        if (request.getNote() != null) {
            order.put("note", request.getNote());
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("order", order);
        body.put("statusMessage", statusMessage);
        return body;
    }

    @GetMapping(path = "/api/status", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> status() {
        boolean lightwellSpring = springFrameworkVersion.contains("rhlw");
        String springRepo = lightwellSpring
                ? "Lightwell remediated (packages.redhat.com or mock)"
                : "Maven Central";

        List<Map<String, String>> dependencies = List.of(
                dep("Spring Framework", "org.springframework:spring-webmvc", springFrameworkVersion, springRepo),
                dep("Jackson Databind", "com.fasterxml.jackson.core:jackson-databind", jacksonVersion, "Maven Central"),
                dep("Apache Commons Text", "org.apache.commons:commons-text", commonsTextVersion, "Maven Central"));

        List<Map<String, String>> cves = VulnerabilityCatalog.rowsFor(springFrameworkVersion).stream()
                .map(row -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("cveId", row.getCveId());
                    m.put("library", row.getLibrary());
                    m.put("status", row.getStatus().name());
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("buildProfile", buildProfile);
        body.put("springFrameworkVersion", springFrameworkVersion);
        body.put("jacksonVersion", jacksonVersion);
        body.put("commonsTextVersion", commonsTextVersion);
        body.put("dependencies", dependencies);
        body.put("cves", cves);
        return body;
    }

    @GetMapping(path = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    private static Map<String, String> dep(String name, String coordinate, String version, String repository) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("coordinate", coordinate);
        m.put("version", version);
        m.put("repository", repository);
        return m;
    }

    private static String safe(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
