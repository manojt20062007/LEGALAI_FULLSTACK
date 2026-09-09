"use client";

import React, { useEffect, useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import { Inspection, ComplianceResult } from "@/types/inspection";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #1e293b",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    color: "#0f172a",
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 10,
    backgroundColor: "#f1f5f9",
    padding: 6,
  },
  row: {
    flexDirection: "row",
    borderBottom: "1px solid #e2e8f0",
    paddingVertical: 6,
  },
  colLabel: {
    width: "40%",
    fontSize: 10,
    color: "#64748b",
    fontWeight: "bold",
  },
  colValue: {
    width: "60%",
    fontSize: 10,
    color: "#0f172a",
  },
  ruleRow: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  ruleName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  ruleDesc: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 4,
  },
  ruleStatusPass: {
    fontSize: 10,
    color: "#16a34a",
    fontWeight: "bold",
  },
  ruleStatusFail: {
    fontSize: 10,
    color: "#dc2626",
    fontWeight: "bold",
  },
  imagesSection: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  image: {
    width: 240,
    height: 240,
    objectFit: "contain",
  },
});

const InspectionPDF = ({ inspection }: { inspection: Inspection }) => {
  const result: ComplianceResult | undefined = inspection.result;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Legal Metrology Inspection Report</Text>
          <Text style={styles.subtitle}>ID: {inspection.id}</Text>
          <Text style={styles.subtitle}>
            Date: {new Date(inspection.created_at).toLocaleString()}
          </Text>
          <Text style={styles.subtitle}>
            Overall Status: {result?.overall_status || "N/A"}
          </Text>
        </View>

        {/* Extracted Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Extracted Product Information</Text>
          <View style={styles.row}>
            <Text style={styles.colLabel}>Product Name</Text>
            <Text style={styles.colValue}>{result?.product.product_name || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>Brand</Text>
            <Text style={styles.colValue}>{result?.product.brand || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>Net Quantity</Text>
            <Text style={styles.colValue}>{result?.product.net_quantity || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>MRP</Text>
            <Text style={styles.colValue}>{result?.product.mrp || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colLabel}>Manufacturer</Text>
            <Text style={styles.colValue}>
              {result?.product.manufacturer_details || "N/A"}
            </Text>
          </View>
        </View>

        {/* Rule Checks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance Rule Checks</Text>
          {result?.rule_evaluations?.map((rule, idx) => (
            <View key={idx} style={styles.ruleRow}>
              <Text style={styles.ruleName}>{rule.rule_id}</Text>
              <Text style={styles.ruleDesc}>{rule.message}</Text>
              <Text
                style={
                  rule.status === "PASS"
                    ? styles.ruleStatusPass
                    : styles.ruleStatusFail
                }
              >
                STATUS: {rule.status}
              </Text>
            </View>
          ))}
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspected Packaging Panels</Text>
          <View style={styles.imagesSection}>
            {inspection.image_urls?.map((url, idx) => (
              <Image
                key={idx}
                style={styles.image}
                src={url + "?q_auto&w_800"} // Cloudinary optimization parameters
              />
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export function PDFGenerator({ inspection }: { inspection: Inspection }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null; // Avoid hydration mismatch

  return (
    <PDFDownloadLink
      document={<InspectionPDF inspection={inspection} />}
      fileName={`LM-Verify-Report-${inspection.id}.pdf`}
    >
      {({ loading }) => (
        <Button disabled={loading} variant="primary" className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          {loading ? "Generating PDF..." : "Download Official Report"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
