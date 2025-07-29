// htmlParser.tsx
//
// This file defines the HTMLContentParser component, which parses and renders HTML content
// as React Native components. It supports text, images, YouTube embeds, links, lists, and ads.
// It also implements image caching, dynamic text styles, offline support, and ad insertion.
//
// Key responsibilities:
// - Parse HTML into a tree of nodes and render as React Native components
// - Support images, YouTube embeds, links, lists, and custom ad insertion
// - Cache images for offline use and performance
// - Apply dynamic text styles and themes
// - Provide offline functionality and network-aware rendering
//
// Usage: Use <HTMLContentParser htmlContent={html} isNetwork={true|false} /> to render article content.
//
// -----------------------------------------------------------------------------

import React, { useContext, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  TextStyle,
  Platform,
} from "react-native";
import { Parser } from "htmlparser2";
import { decode } from "html-entities";
import WebView from "react-native-webview";
import { Linking } from "react-native";
import { truncateHtml } from "./utils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CachedImageComponent from "./ImageComponent";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import {
  downloadImage,
  getArticleTextSize,
} from "@/app/components/functions/Functions";
import BannerAD from "@/app/components/ads/Banner";
import { TouchableWithoutFeedback } from "react-native-gesture-handler";

// Type Definitions: AdUnitKey, ParsedNode, HTMLContentParserProps for type safety and clarity.
type AdUnitKey = "home" | "article1" | "article2" | "article3" | "ros";

interface ParsedNode {
  type: "tag" | "text";
  name?: string;
  attribs?: Record<string, string | AdUnitKey>;
  children?: ParsedNode[];
  parent?: ParsedNode | null;
  data?: string;
}

interface HTMLContentParserProps {
  htmlContent: string;
  isNetwork?: boolean;
}

// HTMLContentParser: Main component for parsing and rendering HTML content.
// - Parses HTML into nodes using htmlparser2
// - Caches images and loads from cache if offline
// - Inserts ads after certain paragraphs
// - Renders all supported HTML elements as React Native components
const HTMLContentParser: React.FC<HTMLContentParserProps> = ({
  htmlContent,
  isNetwork,
}) => {
  const [parsedContent, setParsedContent] = useState<ParsedNode[]>([]);
  const [cachedImageUri, setCachedImageUri] = useState<{
    [key: string]: string | null;
  }>({});
  const { isOnline, theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const screenWidth = Dimensions.get("window").width;

  // Image caching logic
  // useEffect: Handles image caching, loading, and saving to AsyncStorage.
  useEffect(() => {
    const cacheImages = async () => {
      if (!parsedContent.length || !isOnline) return;

      const imageNodes = parsedContent
        .flatMap((node) =>
          node.name === "img" && node.attribs?.src ? [node] : []
        )
        .concat(
          parsedContent
            .filter((node) => node.name === "figure")
            .flatMap(
              (node) =>
                node.children?.filter(
                  (child) => child.name === "img" && child.attribs?.src
                ) || []
            )
        );

      const newCachedImages = { ...cachedImageUri };
      for (const node of imageNodes) {
        const src = node.attribs?.src;
        if (src && !newCachedImages[src]) {
          const localUri = await downloadImage(src);
          newCachedImages[src] = localUri || src;
        }
      }
      setCachedImageUri(newCachedImages);
    };

    cacheImages();
  }, [parsedContent, isOnline]);

  // Load cached images from AsyncStorage
  // useEffect: Parses HTML content into a node tree for rendering.
  useEffect(() => {
    const loadCachedImages = async () => {
      try {
        const storedCache = await AsyncStorage.getItem("cachedImages");
        if (storedCache) {
          setCachedImageUri(JSON.parse(storedCache));
        }
      } catch (error) {
        console.error("Error loading cached images:", error);
      }
    };
    loadCachedImages();
  }, []);

  // Save cached images to AsyncStorage
  useEffect(() => {
    const saveCache = async () => {
      try {
        await AsyncStorage.setItem(
          "cachedImages",
          JSON.stringify(cachedImageUri)
        );
      } catch (error) {
        console.error("Error saving cached images:", error);
      }
    };
    saveCache();
  }, [cachedImageUri]);

  // Parse HTML content
  // useEffect: Parses HTML content into a node tree for rendering.
  useEffect(() => {
    const nodes: ParsedNode[] = [];
    let currentNode: ParsedNode | null = null;
    const nodeStack: ParsedNode[] = [];

    const parser = new Parser(
      {
        onopentag(name, attribs) {
          const newNode: ParsedNode = {
            type: "tag",
            name,
            attribs,
            children: [],
            parent: currentNode,
          };
          if (currentNode) {
            currentNode.children = currentNode.children || [];
            currentNode.children.push(newNode);
          } else {
            nodes.push(newNode);
          }
          nodeStack.push(newNode);
          currentNode = newNode;
        },
        ontext(text) {
          if (text.trim()) {
            const textNode: ParsedNode = {
              type: "text",
              data: text.trim(),
              parent: currentNode,
            };
            if (currentNode) {
              currentNode.children = currentNode.children || [];
              currentNode.children.push(textNode);
            } else {
              nodes.push(textNode);
            }
          }
        },
        onclosetag() {
          nodeStack.pop();
          currentNode = nodeStack[nodeStack.length - 1] || null;
        },
      },
      { decodeEntities: true }
    );

    parser.write(htmlContent);
    parser.end();
    setParsedContent(nodes);
  }, [htmlContent]);

  // insertAds: Inserts ad nodes after specific paragraphs for monetization.
  const insertAds = (nodes: ParsedNode[], isNetwork: boolean): ParsedNode[] => {
    const validParagraphs = nodes.filter(
      (node) =>
        node.name === "p" &&
        node.children?.length &&
        !node.children.some((child) => child.name === "img")
    );

    const modifiedNodes = [...nodes];

    const adUnit1: AdUnitKey = isNetwork ? "ros" : "article1";
    const adUnit2: AdUnitKey = isNetwork ? "ros" : "article2";

    if (validParagraphs.length > 7) {
      let validCount = 0;
      const validParaIndex4 = nodes.findIndex((node) => {
        if (
          node.name === "p" &&
          node.children?.length &&
          !node.children.some((child) => child.name === "img")
        ) {
          validCount++;
          return validCount === 3;
        }
        return false;
      });

      if (validParaIndex4 !== -1 && validParaIndex4 < nodes.length) {
        modifiedNodes.splice(validParaIndex4 + 1, 0, {
          type: "tag",
          name: "ad",
          attribs: { unit: adUnit1 },
        });
      }
    }

    if (validParagraphs.length > 16) {
      let validCount = 0;
      const validParaIndex12 = nodes.findIndex((node) => {
        if (
          node.name === "p" &&
          node.children?.length &&
          !node.children.some((child) => child.name === "img")
        ) {
          validCount++;
          return validCount === 11;
        }
        return false;
      });

      if (validParaIndex12 !== -1 && validParaIndex12 < nodes.length) {
        modifiedNodes.splice(validParaIndex12 + 1, 0, {
          type: "tag",
          name: "ad",
          attribs: { unit: adUnit2 },
        });
      }
    }

    return modifiedNodes;
  };

  const nodesWithAds = useMemo(
    () => insertAds(parsedContent, isNetwork || false),
    [parsedContent, isNetwork]
  );

  const getImageDimensions = (imgAttribs: Record<string, string>) => {
    const width = parseInt(imgAttribs.width) || screenWidth;
    const height = parseInt(imgAttribs.height) || screenWidth;
    const aspectRatio = height / width;
    const calculatedWidth = Math.min(width, screenWidth - 40);
    const calculatedHeight = calculatedWidth * aspectRatio;

    return { width: calculatedWidth, height: calculatedHeight };
  };

  const getBestSrcFromSrcset = (
    srcset: string | undefined,
    src: string
  ): string => {
    if (!srcset) return src;

    const parsedSrcset = srcset.split(",").map((entry) => {
      const [url, width] = entry.trim().split(/\s+/);
      return { url, width: parseInt(width, 10) || Infinity };
    });

    const bestMatch = parsedSrcset
      .sort((a, b) => a.width - b.width)
      .find((entry) => entry.width >= screenWidth);

    return bestMatch?.url || src;
  };

  const getYoutubeVideoId = (url: string): string | null => {
    if (!url) return null;

    if (url.includes("/embed/")) {
      let videoId = url.split("/embed/")[1];
      const ampIndex = videoId?.indexOf("?");
      if (ampIndex !== -1) {
        videoId = videoId?.substring(0, ampIndex);
      }
      return videoId || null;
    }

    const watchUrlMatch = url.match(/[?&]v=([^&]+)/);
    if (watchUrlMatch) return watchUrlMatch[1];

    const shortUrlMatch = url.match(/youtu\.be\/([^?]+)/);
    return shortUrlMatch ? shortUrlMatch[1] : null;
  };

  const renderYoutubeEmbed = (src: string) => {
    const videoId = getYoutubeVideoId(src);
    if (!videoId) return null;

    const videoWidth = screenWidth - 36;
    const videoHeight = Math.floor(videoWidth * (3 / 4));

    return (
      <View
        style={[
          styles.youtubeContainer,
          { width: videoWidth, height: videoHeight },
        ]}
      >
        <WebView
          source={{
            uri: `https://www.youtube.com/embed/${videoId}`,
            headers: {
              "Accept-Language": "ms-MY,ms;q=0.9,en-MY;q=0.8,en;q=0.7",
              Origin: "https://www.youtube.com",
              Referer: "https://www.youtube.com/",
            },
          }}
          style={{
            height: videoHeight,
            width: videoWidth,
            alignSelf: "center",
          }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          originWhitelist={["*"]}
          onError={(syntheticEvent) => {
            console.warn("WebView error:", syntheticEvent.nativeEvent);
          }}
        />
      </View>
    );
  };

  const renderTextContent = (node: ParsedNode): React.ReactNode => {
    const androidTextProps = Platform.select({
      android: {
        allowFontScaling: false,
        includeFontPadding: false,
        textBreakStrategy: "simple",
      },
      ios: {},
    });
    // Handle plain text
    if (node.type === "text") {
      let text = decode((node.data || "").replace(/,([^\s])/g, ", $1"));

      if (text === "“") {
        text = " " + text; // Add space before opening quote
      } else if (text === "”") {
        text = text + " "; // Add space after closing quote
      }

      return (
        <Text
          {...androidTextProps}
          style={{
            textAlign: "left",
            alignSelf: "flex-start",
            color: theme.textColor,
            flexShrink: 1,
            flexWrap: "wrap",
            width: "100%",
          }}
          adjustsFontSizeToFit={true}
          textBreakStrategy="simple"
          numberOfLines={0}
          ellipsizeMode="clip"
        >
          {text}
        </Text>
      );
    }

    // Define type-checking functions
    const isItalic = node.name === "em" || node.name === "i";
    const isBold = node.name === "strong" || node.name === "b";
    const hasItalicChild = node.children?.some(
      (child) => child.name === "em" || child.name === "i"
    );
    const hasBoldParent =
      node.parent?.name === "strong" || node.parent?.name === "b";

    // Handle bold+italic combination
    if ((isBold && hasItalicChild) || (isItalic && hasBoldParent)) {
      return (
        <Text
          style={{
            textAlign: "left",
            alignSelf: "flex-start",
            fontFamily:
              Platform.OS === "android"
                ? undefined
                : "SF-Pro-Display-MediumItalic",
            fontWeight: Platform.OS === "android" ? "500" : undefined,
            fontStyle: "italic",
            fontSize: 19,
          }}
        >
          {node.children?.map((child, index) => (
            <React.Fragment key={index}>
              {renderTextContent(child)}
            </React.Fragment>
          ))}
        </Text>
      );
    }

    // Handle italic
    if (isItalic) {
      return (
        <Text
          style={{
            textAlign: "left",
            alignSelf: "flex-start",
            fontFamily:
              Platform.OS === "android"
                ? undefined
                : "SF-Pro-Display-RegularItalic",
            fontWeight: Platform.OS === "android" ? "400" : undefined,
            fontStyle: "italic",
          }}
        >
          {node.children?.map((child, index) => (
            <React.Fragment key={index}>
              {renderTextContent(child)}
            </React.Fragment>
          ))}
        </Text>
      );
    }

    // Handle bold
    if (isBold) {
      return (
        <Text
          style={{
            textAlign: "left",
            alignSelf: "flex-start",
            fontFamily:
              Platform.OS === "android" ? undefined : "SF-Pro-Display-Semibold",
            fontWeight: Platform.OS === "android" ? "600" : undefined,
            fontSize: getArticleTextSize(19.0, ""),
            color: theme.textColor,
          }}
        >
          {node.children?.map((child, index) => (
            <React.Fragment key={index}>
              {renderTextContent(child)}
            </React.Fragment>
          ))}
        </Text>
      );
    }

    // Render spans with styles (e.g., color)
    if (node.name === "span") {
      const spanStyles: TextStyle[] = [];
      if (node.attribs?.style?.includes("color: #ff0000")) {
        spanStyles.push({ color: "#ff0000" });
      }

      return (
        <Text>
          <Text> </Text>
          <Text style={[...spanStyles, styles.linkText]}>
            {node.children?.map((child, index) => {
              if (child.name === "a") {
                const aStyles: TextStyle[] = [];
                if (child.attribs?.style?.includes("color: #ff0000")) {
                  aStyles.push({ color: "#ff0000" });
                }
                return (
                  <Text
                    key={index}
                    style={[...spanStyles, ...aStyles, styles.linkText]}
                    onPress={() => {
                      if (child.attribs?.href) {
                        Linking.openURL(child.attribs.href).catch(
                          console.error
                        );
                      }
                    }}
                  >
                    {child.children?.map((innerChild, i) => (
                      <Text key={i}>{innerChild.data}</Text>
                    ))}
                  </Text>
                );
              }
              return <Text key={index}>{child.data}</Text>;
            })}
          </Text>
          <Text> </Text>
        </Text>
      );
    }

    // Handle links: <a>...</a>
    if (node.name === "a") {
      const href = node.attribs?.href;

      return (
        <Text
          onPress={() => {
            if (href) {
              Linking.openURL(href).catch((err) =>
                console.error("Failed to open link:", err)
              );
            }
          }}
        >
          {node.children?.map((child, index) => (
            <React.Fragment key={index}>
              {renderTextContent(child)}
            </React.Fragment>
          ))}
        </Text>
      );
    }

    // Render other child nodes recursively
    return node.children?.map((child, index) => renderTextContent(child));
  };

  const renderFigcaptionContent = (node: ParsedNode): React.ReactNode => {
    if (node.type === "text") {
      return (
        <Text
          style={{
            color: theme.textColor,
            fontFamily:
              Platform.OS === "android"
                ? undefined
                : "SF-Pro-Display-RegularItalic",
            fontWeight: Platform.OS === "android" ? "400" : undefined,
            fontStyle: "italic",
          }}
        >
          {decode(node.data || "")}
        </Text>
      );
    }

    if (node.name === "em" || node.name === "i") {
      return (
        <Text style={styles.italicText}>
          {node.children?.map((child, index) => (
            <React.Fragment key={index}>
              {renderFigcaptionContent(child)}
            </React.Fragment>
          ))}
        </Text>
      );
    }

    return node.children?.map((child, index) => (
      <React.Fragment key={index}>
        {renderFigcaptionContent(child)}
      </React.Fragment>
    ));
  };

  const renderNode = (
    node: ParsedNode,
    index: number,
    parentName?: string
  ): React.ReactNode => {
    if (node.type === "text" && !node.name) {
      let text = decode((node.data || "").replace(/,([^\s])/g, ", $1"));

      if (text === "“") {
        text = " " + text;
      } else if (text === "”") {
        text = text + " ";
      }

      return text ? (
        <Text
          key={index}
          style={[
            styles.paragraph,
            {
              fontSize: getArticleTextSize(19.0, textSize),
              color: theme.textColor,
            },
          ]}
          textBreakStrategy="simple"
          adjustsFontSizeToFit={true}
          numberOfLines={0}
          ellipsizeMode="clip"
        >
          {text}
        </Text>
      ) : null;
    }

    if (!node.name) return null;

    switch (node.name) {
      case "div": {
        if (node.attribs?.class?.includes("youtube-container")) {
          const iframe = node.children?.find(
            (child) => child.name === "iframe"
          );
          if (iframe?.attribs?.src) {
            return (
              <View key={index} style={styles.youtubeWrapper}>
                {renderYoutubeEmbed(iframe.attribs.src)}
              </View>
            );
          }
        }
        return node.children?.map((child, i) => renderNode(child, i));
      }

      case "iframe": {
        if (node.attribs?.class?.includes("wp-embedded-content")) return null;
        if (node.attribs?.src?.includes("youtube")) {
          return (
            <View key={index} style={styles.youtubeWrapper}>
              {renderYoutubeEmbed(node.attribs.src)}
            </View>
          );
        }
        return null;
      }

      case "figure": {
        const imgNode = node.children?.find((child) => child.name === "img");
        const captionNode = node.children?.find(
          (child) => child.name === "figcaption"
        );

        if (!imgNode?.attribs) return null;

        const { src, srcset } = imgNode.attribs;
        const selectedSrc = getBestSrcFromSrcset(srcset, src);
        const localUri = cachedImageUri[selectedSrc] || selectedSrc;
        const dimensions = getImageDimensions(imgNode.attribs);

        return (
          <View
            key={index}
            style={[styles.figureMainContainer, { width: dimensions.width }]}
          >
            <View style={[styles.figureContainer, { width: dimensions.width }]}>
              <View style={styles.imageWrapper}>
                <CachedImageComponent
                  src={localUri}
                  width={dimensions.width}
                  height={dimensions.height}
                />
              </View>
              {captionNode && (
                <View style={{ width: "100%", alignItems: "center" }}>
                  <Text
                    style={[
                      styles.caption1,
                      { fontSize: getArticleTextSize(15.0, textSize) },
                    ]}
                  >
                    {captionNode.children?.map((child, i) => (
                      <React.Fragment key={i}>
                        {renderFigcaptionContent(child)}
                      </React.Fragment>
                    ))}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      }

      case "p": {
        const strongNode = node.children?.find(
          (child) => child.name === "strong"
        );
        const imgNode =
          strongNode?.children?.find((child) => child.name === "img") ||
          node.children?.find((child) => child.name === "img");

        if (imgNode?.attribs) {
          const { src, srcset } = imgNode.attribs;
          const selectedSrc = getBestSrcFromSrcset(srcset, src);
          const localUri = cachedImageUri[selectedSrc] || selectedSrc;
          const dimensions = getImageDimensions(imgNode.attribs);

          return (
            <View key={index} style={styles.paragraphWithImage}>
              <View style={styles.imageWrapper}>
                <CachedImageComponent
                  src={localUri}
                  width={dimensions.width}
                  height={dimensions.height}
                />
              </View>
              <View style={styles.textContainer}>
                {node.children?.some((child) => child.name !== "img") && (
                  <View style={{ width: "100%" }}>
                    <Text
                      style={[
                        styles.paragraph,
                        {
                          fontSize: getArticleTextSize(19.0, textSize),
                          color: theme.textColor,
                          flexShrink: 1,
                        },
                      ]}
                    >
                      {node.children.map((child, i) => {
                        if (child.name === "strong") {
                          return (
                            <Text
                              key={i}
                              style={[
                                styles.strongText,
                                {
                                  fontSize: getArticleTextSize(19.0, textSize),
                                  color: theme.textColor,
                                  flexShrink: 1,
                                },
                              ]}
                            >
                              {child.children?.map(
                                (strongChild, strongIndex) => (
                                  <React.Fragment key={strongIndex}>
                                    {renderTextContent(strongChild)}
                                  </React.Fragment>
                                )
                              )}
                            </Text>
                          );
                        }
                        if (child.name !== "img") {
                          return (
                            <React.Fragment key={i}>
                              {renderTextContent(child)}
                            </React.Fragment>
                          );
                        }
                        return null;
                      })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        }

        // Normal paragraph (no image)
        return (
          <View
            key={index}
            style={{
              width: "100%",
              paddingHorizontal: 0,
              marginBottom: 8,
              flexShrink: 1,
            }}
          >
            <Text
              style={[
                styles.paragraph,
                {
                  fontSize: getArticleTextSize(19.0, textSize),
                  color: theme.textColor,
                  flexShrink: 1,
                  flexWrap: "wrap",
                  width: "100%",
                },
              ]}
              // ellipsizeMode="clip" // Don't ellipsize
              textBreakStrategy="simple"
              allowFontScaling={false}
            >
              {node.children?.map((child, i) => (
                <React.Fragment key={i}>
                  {renderTextContent(child)}
                </React.Fragment>
              ))}
            </Text>
          </View>
        );
      }

      case "ad": {
        const unit = node.attribs?.unit as AdUnitKey | undefined;
        if (
          !unit ||
          !["home", "article1", "article2", "article3", "ros"].includes(unit)
        ) {
          // console.warn(`Invalid ad unit: ${unit}, skipping ad render`);
          return null;
        }
        return <BannerAD key={index} unit={unit} />;
      }

      case "ul": {
        return (
          <View
            key={index}
            style={[
              styles.unorderedList,
              { backgroundColor: theme.backgroundColor },
            ]}
          >
            {node.children?.map((child, i) => renderNode(child, i, "ul"))}
          </View>
        );
      }

      case "ol": {
        return (
          <View
            key={index}
            style={[
              styles.orderedList,
              { backgroundColor: theme.backgroundColor },
            ]}
          >
            {node.children?.map((child, i) => renderNode(child, i, "ol"))}
          </View>
        );
      }

      case "li": {
        const isUnordered = parentName === "ul";
        return (
          <View key={index} style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.textColor }]}>
              {isUnordered ? "• " : `${index + 1}. `}
            </Text>
            <Text
              style={[
                styles.listText,
                {
                  color: theme.textColor,
                  fontSize: getArticleTextSize(19, textSize),
                },
              ]}
            >
              {node.children?.map((child, i) => (
                <React.Fragment key={i}>
                  {renderTextContent(child)}
                </React.Fragment>
              ))}
            </Text>
          </View>
        );
      }

      case "strong": {
        return (
          <Text
            style={[
              styles.strongText,
              {
                fontSize: getArticleTextSize(19.0, textSize),
                color: theme.textColor,
              },
            ]}
          >
            {node.children?.map((child, index) => (
              <React.Fragment key={index}>
                {renderTextContent(child)}
              </React.Fragment>
            ))}
          </Text>
        );
      }

      case "blockquote": {
        if (node.attribs?.class?.includes("wp-embedded-content")) {
          const pNode = node.children?.find((child) => child.name === "p");
          const linkNode = pNode?.children?.find(
            (child) => child.name === "a" && child.attribs
          );

          if (linkNode?.attribs?.href) {
            const fullText = linkNode.children
              ?.map((child) =>
                child.type === "text"
                  ? decode(
                      truncateHtml(child.data || "", child.data?.length || 0)
                    )
                  : ""
              )
              .join("");

            return (
              <View key={index} style={{ width: "100%" }}>
                <TouchableOpacity
                  onPress={() => {
                    if (linkNode.attribs?.href) {
                      Linking.openURL(linkNode.attribs.href).catch((err) =>
                        console.error("Error opening link:", err)
                      );
                    }
                  }}
                  style={styles.embeddedLink}
                >
                  <Text
                    style={[
                      styles.embeddedTitle,
                      { fontSize: getArticleTextSize(20.0, textSize) },
                    ]}
                  >
                    {fullText}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }
        }
        return (
          <View key={index} style={styles.blockquote}>
            {node.children?.map((child, i) => renderNode(child, i))}
          </View>
        );
      }

      default:
        return node.children?.map((child, i) => renderNode(child, i));
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentContainer}>
        {nodesWithAds.map((node, index) => renderNode(node, index))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    alignItems: "center",
    width: "100%",
    paddingBottom: 10,
  },
  figureMainContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  figureContainer: {
    alignItems: "center",
    maxWidth: "100%",
    paddingTop: 5,
  },
  paragraphWithImage: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
  },
  imageWrapper: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  image: {
    backgroundColor: "#f0f0f0",
  },
  caption1: {
    marginTop: 3,
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "SF-Pro-Display-RegularItalic",
      android: undefined, // Use system font on Android
    }),
    fontWeight: Platform.OS === "android" ? "400" : undefined,
    fontStyle: "italic",
  },
  paragraph: {
    lineHeight: Platform.select({
      ios: 24,
      android: 28, // Increased line height for Android
    }),
    marginVertical: 8,
    fontFamily: Platform.select({
      ios: "SF-Pro-Display-Regular",
      android: undefined, // Use system font on Android
    }),
    fontWeight: Platform.OS === "android" ? "400" : undefined,
    textAlign: "left",
    width: "95%",
    alignSelf: "flex-start",
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: "center",
      },
    }),
    flexShrink: 1,
    flexWrap: "wrap",
    // Add these properties for One UI 6.0+ compatibility
    flexBasis: "auto",
    minWidth: 0,
    paddingRight: 4,
    includeFontPadding: false, // ← important for Android text clipping
  },
  italicText: {
    fontStyle: "italic",
    fontFamily: Platform.select({
      ios: "SF-Pro-Display-RegularItalic",
      android: undefined,
    }),
    fontWeight: Platform.OS === "android" ? "400" : undefined,
  },
  strongText: {
    fontWeight: Platform.select({
      ios: "bold",
      android: "700",
    }),
    fontFamily: Platform.select({
      ios: "SF-Pro-Display-Bold",
      android: undefined,
    }),
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  youtubeWrapper: {
    width: "100%",
    marginVertical: 10,
    alignItems: "center",
  },
  youtubeContainer: {
    overflow: "hidden",
    backgroundColor: "#000",
    flex: 1,
  },
  unorderedList: {
    marginVertical: 8,
    paddingLeft: 30,
    paddingHorizontal: 0,
    width: "100%",
  },
  orderedList: {
    marginVertical: 8,
    paddingHorizontal: 0,
    width: "100%",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
    width: "100%",
  },
  bullet: {
    fontSize: 19,
    lineHeight: 24,
    fontFamily:
      Platform.OS === "android" ? undefined : "SF-Pro-Display-Regular",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
    width: 24,
    textAlign: "left",
  },
  listItemContent: {
    flex: 1,
  },
  listText: {
    fontSize: 19,
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: "wrap",
    fontFamily: Platform.select({
      ios: "SF-Pro-Display-Regular",
      android: undefined,
    }),
    fontWeight: Platform.OS === "android" ? "400" : undefined,
    width: "90%", // or flex: 1
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: "#cccccc",
    paddingLeft: 16,
    marginVertical: 10,
  },
  embeddedLink: {
    paddingVertical: 5,
  },
  embeddedTitle: {
    fontFamily: Platform.select({
      ios: "SF-Pro-Display-Regular",
      android: undefined,
    }),
    color: "#c62828",
    textDecorationLine: "underline",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
  },
  linkText: {
    textDecorationLine: "underline",
    color: "#ff0000",
    fontFamily: Platform.select({
      ios: "SF-Pro-Display-Regular",
      android: undefined,
    }),
    fontWeight: Platform.OS === "android" ? "400" : undefined,
  },
  textContainer: {
    width: "100%",
    flexShrink: 1,
    flexGrow: 1,
  },
});

export default HTMLContentParser;
