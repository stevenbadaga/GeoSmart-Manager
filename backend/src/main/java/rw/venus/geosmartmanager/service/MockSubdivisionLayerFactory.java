package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.domain.DatasetType;

import java.util.List;

public final class MockSubdivisionLayerFactory {
    private MockSubdivisionLayerFactory() {
    }

    public static List<LayerDefinition> demoLayers() {
        return List.of(
                new LayerDefinition("PARCELS", "Demo Parcels", DatasetType.CADASTRAL, parcelsGeoJson(), metadata("PARCELS")),
                new LayerDefinition("ZONING", "Demo Zoning", DatasetType.ZONING, zoningGeoJson(), metadata("ZONING")),
                new LayerDefinition("ROADS", "Demo Roads", DatasetType.ROAD_NETWORK, roadsGeoJson(), metadata("ROADS")),
                new LayerDefinition("ADMIN_BOUNDARIES", "Demo Administrative Boundaries", DatasetType.ADMIN_BOUNDARY, adminGeoJson(), metadata("ADMIN_BOUNDARIES")),
                new LayerDefinition("CONSTRAINTS", "Demo Constraints", DatasetType.CONSTRAINTS, constraintsGeoJson(), metadata("CONSTRAINTS"))
        );
    }

    public static String sampleProposalGeoJson() {
        return """
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "plotNumber": 1,
                        "label": "Lot 1"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1140, -1.9560], [30.1140, -1.9550], [30.1150, -1.9550], [30.1150, -1.9560], [30.1140, -1.9560]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "plotNumber": 2,
                        "label": "Lot 2"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1150, -1.9560], [30.1150, -1.9550], [30.1160, -1.9550], [30.1160, -1.9560], [30.1150, -1.9560]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "plotNumber": 3,
                        "label": "Lot 3"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1140, -1.9550], [30.1140, -1.9540], [30.1150, -1.9540], [30.1150, -1.9550], [30.1140, -1.9550]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "plotNumber": 4,
                        "label": "Lot 4"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1150, -1.9550], [30.1150, -1.9540], [30.1160, -1.9540], [30.1160, -1.9550], [30.1150, -1.9550]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "kind": "ACCESS_SERVITUDE",
                        "widthMeters": 4
                      },
                      "geometry": {
                        "type": "LineString",
                        "coordinates": [[30.1150, -1.9561], [30.1150, -1.9540]]
                      }
                    }
                  ]
                }
                """;
    }

    private static String metadata(String layerKey) {
        return """
                {
                  "layerKey": "%s",
                  "demo": true,
                  "supportedFutureImports": ["GEOJSON", "SHAPEFILE", "GEOPACKAGE"]
                }
                """.formatted(layerKey);
    }

    private static String parcelsGeoJson() {
        return """
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "upi": "1/01/02/03/0001",
                        "district": "Gasabo",
                        "sector": "Remera",
                        "cell": "Rukiri I",
                        "village": "Nyabisindu",
                        "currentLandUse": "RESIDENTIAL"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1140, -1.9560], [30.1140, -1.9540], [30.1160, -1.9540], [30.1160, -1.9560], [30.1140, -1.9560]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "upi": "1/01/02/03/0002",
                        "district": "Gasabo",
                        "sector": "Remera",
                        "cell": "Rukiri I",
                        "village": "Mukoni",
                        "currentLandUse": "MIXED_USE"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1162, -1.9560], [30.1162, -1.9541], [30.1181, -1.9541], [30.1181, -1.9560], [30.1162, -1.9560]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "upi": "1/01/02/03/0003",
                        "district": "Gasabo",
                        "sector": "Remera",
                        "cell": "Rukiri I",
                        "village": "Amahoro",
                        "currentLandUse": "AGRICULTURAL"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1142, -1.9538], [30.1142, -1.9519], [30.1166, -1.9519], [30.1166, -1.9538], [30.1142, -1.9538]]]
                      }
                    }
                  ]
                }
                """;
    }

    private static String zoningGeoJson() {
        return """
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "zoneCode": "R1",
                        "allowedLandUse": ["RESIDENTIAL", "MIXED_USE"],
                        "minimumPlotSizeSqm": 8000,
                        "frontSetbackM": 4,
                        "sideSetbackM": 2,
                        "maximumCoveragePct": 60,
                        "far": 1.2,
                        "heightLimitM": 12
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1135, -1.9565], [30.1135, -1.9535], [30.1163, -1.9535], [30.1163, -1.9565], [30.1135, -1.9565]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "zoneCode": "C1",
                        "allowedLandUse": ["COMMERCIAL", "MIXED_USE"],
                        "minimumPlotSizeSqm": 6000,
                        "frontSetbackM": 3,
                        "sideSetbackM": 1.5,
                        "maximumCoveragePct": 75,
                        "far": 2.5,
                        "heightLimitM": 18
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1160, -1.9565], [30.1160, -1.9536], [30.1186, -1.9536], [30.1186, -1.9565], [30.1160, -1.9565]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "zoneCode": "A1",
                        "allowedLandUse": ["AGRICULTURAL"],
                        "minimumPlotSizeSqm": 15000,
                        "frontSetbackM": 5,
                        "sideSetbackM": 3,
                        "maximumCoveragePct": 35,
                        "far": 0.4,
                        "heightLimitM": 8
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1138, -1.9540], [30.1138, -1.9514], [30.1170, -1.9514], [30.1170, -1.9540], [30.1138, -1.9540]]]
                      }
                    }
                  ]
                }
                """;
    }

    private static String roadsGeoJson() {
        return """
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "roadClass": "DISTRICT",
                        "rightOfWayWidthM": 12
                      },
                      "geometry": {
                        "type": "LineString",
                        "coordinates": [[30.1130, -1.9561], [30.1185, -1.9561]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "roadClass": "LOCAL",
                        "rightOfWayWidthM": 8
                      },
                      "geometry": {
                        "type": "LineString",
                        "coordinates": [[30.11394, -1.9542], [30.11394, -1.9515]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "roadClass": "COLLECTOR",
                        "rightOfWayWidthM": 10
                      },
                      "geometry": {
                        "type": "LineString",
                        "coordinates": [[30.1182, -1.9562], [30.1182, -1.9537]]
                      }
                    }
                  ]
                }
                """;
    }

    private static String adminGeoJson() {
        return """
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "level": "DISTRICT",
                        "name": "Gasabo"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1128, -1.9568], [30.1128, -1.9512], [30.1188, -1.9512], [30.1188, -1.9568], [30.1128, -1.9568]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "level": "SECTOR",
                        "name": "Remera"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1132, -1.9565], [30.1132, -1.9515], [30.1184, -1.9515], [30.1184, -1.9565], [30.1132, -1.9565]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "level": "CELL",
                        "name": "Rukiri I"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1136, -1.9562], [30.1136, -1.9517], [30.1180, -1.9517], [30.1180, -1.9562], [30.1136, -1.9562]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "level": "VILLAGE",
                        "name": "Nyabisindu"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1138, -1.9562], [30.1138, -1.9539], [30.1161, -1.9539], [30.1161, -1.9562], [30.1138, -1.9562]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "level": "VILLAGE",
                        "name": "Mukoni"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1161, -1.9562], [30.1161, -1.9539], [30.1182, -1.9539], [30.1182, -1.9562], [30.1161, -1.9562]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "level": "VILLAGE",
                        "name": "Amahoro"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1139, -1.9539], [30.1139, -1.9517], [30.1168, -1.9517], [30.1168, -1.9539], [30.1139, -1.9539]]]
                      }
                    }
                  ]
                }
                """;
    }

    private static String constraintsGeoJson() {
        return """
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "constraintType": "WETLAND"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1160, -1.9546], [30.1160, -1.9538], [30.1165, -1.9538], [30.1165, -1.9546], [30.1160, -1.9546]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "constraintType": "RIVER_BUFFER",
                        "bufferMeters": 8
                      },
                      "geometry": {
                        "type": "LineString",
                        "coordinates": [[30.1180, -1.9564], [30.1180, -1.9537]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "constraintType": "PROTECTED_AREA"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1140, -1.9519], [30.1140, -1.9513], [30.1149, -1.9513], [30.1149, -1.9519], [30.1140, -1.9519]]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "constraintType": "UTILITY_CORRIDOR",
                        "bufferMeters": 5
                      },
                      "geometry": {
                        "type": "LineString",
                        "coordinates": [[30.1168, -1.9562], [30.1168, -1.9539]]
                      }
                    },
                    {
                      "type": "Feature",
                      "properties": {
                        "constraintType": "NO_BUILD_AREA"
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[30.1167, -1.9554], [30.1167, -1.9548], [30.1174, -1.9548], [30.1174, -1.9554], [30.1167, -1.9554]]]
                      }
                    }
                  ]
                }
                """;
    }

    public record LayerDefinition(
            String key,
            String name,
            DatasetType type,
            String geoJson,
            String metadataJson
    ) {
    }
}
