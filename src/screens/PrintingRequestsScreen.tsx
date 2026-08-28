import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';

import {
    getMyPrintingRequests,
    getPrintingFileSignedUrl,
} from '../services/printingService';


// ======================================================
// TYPES
// ======================================================

type PrintingRequest = {
  id: string;

  request_number: string;

  original_file_name: string;

  storage_path: string;

  mime_type: string | null;

  file_size: number | null;

  print_type: string;

  paper_size: string;

  print_side: string;

  page_count: number;

  copies: number;

  binding: string;

  lamination: string;

  print_cost: number | string;

  binding_cost: number | string;

  lamination_cost: number | string;

  estimated_total: number | string;

  final_total: number | string | null;

  status: string;

  customer_notes: string | null;

  staff_notes: string | null;

  created_at: string;

  updated_at: string;
};


// ======================================================
// SCREEN
// ======================================================

export default function PrintingRequestsScreen() {
  const router =
    useRouter();


  const [
    requests,
    setRequests,
  ] =
    useState<PrintingRequest[]>([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    openingFileId,
    setOpeningFileId,
  ] =
    useState<string | null>(null);


  // ====================================================
  // LOAD REQUESTS
  // ====================================================

  const loadRequests =
    useCallback(
      async (
        refresh = false
      ) => {
        try {
          if (refresh) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }


          const data =
            await getMyPrintingRequests();


          setRequests(
            data as PrintingRequest[]
          );

        } catch (
          error: any
        ) {
          console.error(
            'Load printing requests error:',
            error
          );


          Alert.alert(
            'Unable to Load',
            error?.message ??
              'Unable to load your printing requests.'
          );

        } finally {
          setLoading(
            false
          );


          setRefreshing(
            false
          );
        }
      },
      []
    );


  // ====================================================
  // RELOAD WHEN SCREEN OPENS
  // ====================================================

  useFocusEffect(
    useCallback(
      () => {
        loadRequests();
      },
      [loadRequests]
    )
  );


  // ====================================================
  // OPEN PRIVATE FILE
  // ====================================================

  const openDocument =
    async (
      request: PrintingRequest
    ) => {
      try {
        setOpeningFileId(
          request.id
        );


        const signedUrl =
          await getPrintingFileSignedUrl(
            request.storage_path
          );


        const supported =
          await Linking.canOpenURL(
            signedUrl
          );


        if (!supported) {
          throw new Error(
            'Unable to open this document on your device.'
          );
        }


        await Linking.openURL(
          signedUrl
        );

      } catch (
        error: any
      ) {
        Alert.alert(
          'Document Error',
          error?.message ??
            'Unable to open the document.'
        );

      } finally {
        setOpeningFileId(
          null
        );
      }
    };


  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
        edges={[
          'top',
        ]}
      >
        <Header
          onBack={() =>
            router.back()
          }
        />


        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={
              COLORS.primary
            }
          />


          <Text
            style={
              styles.loadingText
            }
          >
            Loading printing requests...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  // ====================================================
  // UI
  // ====================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        'top',
      ]}
    >
      <Header
        onBack={() =>
          router.back()
        }
      />


      {requests.length ===
      0 ? (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={() =>
                loadRequests(
                  true
                )
              }
              tintColor={
                COLORS.primary
              }
            />
          }
          contentContainerStyle={
            styles.emptyContainer
          }
        >
          <View
            style={
              styles.emptyIcon
            }
          >
            <Ionicons
              name="print-outline"
              size={48}
              color={
                COLORS.primary
              }
            />
          </View>


          <Text
            style={
              styles.emptyTitle
            }
          >
            No Printing Requests
          </Text>


          <Text
            style={
              styles.emptyText
            }
          >
            Your submitted printing requests will appear here.
          </Text>


          <Pressable
            style={
              styles.newRequestButton
            }
            onPress={() =>
              router.replace(
                '/printing-service'
              )
            }
          >
            <Ionicons
              name="add"
              size={20}
              color={
                COLORS.white
              }
            />

            <Text
              style={
                styles.newRequestButtonText
              }
            >
              NEW PRINTING REQUEST
            </Text>
          </Pressable>
        </ScrollView>

      ) : (
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.content
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={() =>
                loadRequests(
                  true
                )
              }
              tintColor={
                COLORS.primary
              }
            />
          }
        >

          {/* TOP CARD */}

          <View
            style={
              styles.infoCard
            }
          >
            <View
              style={
                styles.infoIcon
              }
            >
              <Ionicons
                name="receipt-outline"
                size={28}
                color={
                  COLORS.primary
                }
              />
            </View>


            <View
              style={
                styles.infoContent
              }
            >
              <Text
                style={
                  styles.infoTitle
                }
              >
                My Printing Jobs
              </Text>


              <Text
                style={
                  styles.infoText
                }
              >
                Track your printing request status and pricing.
              </Text>
            </View>


            <View
              style={
                styles.countBadge
              }
            >
              <Text
                style={
                  styles.countBadgeText
                }
              >
                {
                  requests.length
                }
              </Text>
            </View>
          </View>


          {/* NEW REQUEST */}

          <Pressable
            style={
              styles.createButton
            }
            onPress={() =>
              router.push(
                '/printing-service'
              )
            }
          >
            <Ionicons
              name="add-circle-outline"
              size={21}
              color={
                COLORS.white
              }
            />


            <Text
              style={
                styles.createButtonText
              }
            >
              NEW PRINTING REQUEST
            </Text>
          </Pressable>


          {/* REQUEST LIST */}

          {requests.map(
            request => (
              <PrintingRequestCard
                key={
                  request.id
                }
                request={
                  request
                }
                opening={
                  openingFileId ===
                  request.id
                }
                onOpenDocument={() =>
                  openDocument(
                    request
                  )
                }
              />
            )
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}


// ======================================================
// HEADER
// ======================================================

function Header({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <View
      style={
        styles.header
      }
    >
      <Pressable
        style={
          styles.headerButton
        }
        onPress={
          onBack
        }
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color={
            COLORS.textPrimary
          }
        />
      </Pressable>


      <Text
        style={
          styles.headerTitle
        }
      >
        My Printing Requests
      </Text>


      <View
        style={
          styles.headerButton
        }
      />
    </View>
  );
}


// ======================================================
// REQUEST CARD
// ======================================================

function PrintingRequestCard({
  request,
  opening,
  onOpenDocument,
}: {
  request: PrintingRequest;

  opening: boolean;

  onOpenDocument: () => void;
}) {
  const estimatedTotal =
    Number(
      request.estimated_total ??
        0
    );


  const finalTotal =
    request.final_total ===
      null
      ? null
      : Number(
          request.final_total
        );


  const displayTotal =
    finalTotal ??
    estimatedTotal;


  return (
    <View
      style={
        styles.requestCard
      }
    >

      {/* CARD HEADER */}

      <View
        style={
          styles.requestTop
        }
      >
        <View
          style={
            styles.requestNumberContainer
          }
        >
          <Text
            style={
              styles.requestNumberLabel
            }
          >
            REQUEST NO.
          </Text>


          <Text
            style={
              styles.requestNumber
            }
          >
            {
              request.request_number
            }
          </Text>
        </View>


        <StatusBadge
          status={
            request.status
          }
        />
      </View>


      {/* DATE */}

      <View
        style={
          styles.dateRow
        }
      >
        <Ionicons
          name="calendar-outline"
          size={15}
          color={
            COLORS.textSecondary
          }
        />


        <Text
          style={
            styles.dateText
          }
        >
          {formatDate(
            request.created_at
          )}
        </Text>
      </View>


      {/* FILE */}

      <View
        style={
          styles.documentBox
        }
      >
        <View
          style={
            styles.documentIcon
          }
        >
          <Ionicons
            name="document-text-outline"
            size={24}
            color={
              COLORS.primary
            }
          />
        </View>


        <View
          style={
            styles.documentInfo
          }
        >
          <Text
            numberOfLines={
              2
            }
            style={
              styles.documentName
            }
          >
            {
              request.original_file_name
            }
          </Text>


          <Text
            style={
              styles.documentMeta
            }
          >
            {request.file_size
              ? formatFileSize(
                  request.file_size
                )
              : 'Document'}
          </Text>
        </View>


        <Pressable
          style={
            styles.openFileButton
          }
          onPress={
            onOpenDocument
          }
          disabled={
            opening
          }
        >
          {opening ? (
            <ActivityIndicator
              size="small"
              color={
                COLORS.primary
              }
            />
          ) : (
            <Ionicons
              name="open-outline"
              size={20}
              color={
                COLORS.primary
              }
            />
          )}
        </Pressable>
      </View>


      {/* OPTIONS */}

      <View
        style={
          styles.detailsGrid
        }
      >
        <DetailItem
          icon="color-palette-outline"
          label="Print"
          value={
            request.print_type
          }
        />


        <DetailItem
          icon="document-outline"
          label="Paper"
          value={
            request.paper_size
          }
        />


        <DetailItem
          icon="copy-outline"
          label="Side"
          value={
            request.print_side
          }
        />


        <DetailItem
          icon="documents-outline"
          label="Pages"
          value={String(
            request.page_count
          )}
        />


        <DetailItem
          icon="duplicate-outline"
          label="Copies"
          value={String(
            request.copies
          )}
        />


        <DetailItem
          icon="book-outline"
          label="Binding"
          value={
            request.binding
          }
        />


        <DetailItem
          icon="albums-outline"
          label="Lamination"
          value={
            request.lamination
          }
        />
      </View>


      {/* STAFF NOTE */}

      {request.staff_notes ? (
        <View
          style={
            styles.noteBox
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={
              COLORS.primary
            }
          />


          <View
            style={
              styles.noteContent
            }
          >
            <Text
              style={
                styles.noteTitle
              }
            >
              Lucky Hub Note
            </Text>


            <Text
              style={
                styles.noteText
              }
            >
              {
                request.staff_notes
              }
            </Text>
          </View>
        </View>
      ) : null}


      {/* TOTAL */}

      <View
        style={
          styles.totalSection
        }
      >
        <View>
          <Text
            style={
              styles.totalTitle
            }
          >
            {finalTotal !==
            null
              ? 'Final Total'
              : 'Estimated Total'}
          </Text>


          {finalTotal ===
          null ? (
            <Text
              style={
                styles.totalNote
              }
            >
              Final price pending confirmation
            </Text>
          ) : null}
        </View>


        <Text
          style={
            styles.totalAmount
          }
        >
          Rs.{' '}
          {displayTotal.toLocaleString()}
        </Text>
      </View>

    </View>
  );
}


// ======================================================
// DETAIL ITEM
// ======================================================

function DetailItem({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  label: string;

  value: string;
}) {
  return (
    <View
      style={
        styles.detailItem
      }
    >
      <Ionicons
        name={
          icon
        }
        size={18}
        color={
          COLORS.primary
        }
      />


      <View
        style={
          styles.detailInfo
        }
      >
        <Text
          style={
            styles.detailLabel
          }
        >
          {label}
        </Text>


        <Text
          style={
            styles.detailValue
          }
          numberOfLines={
            2
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


// ======================================================
// STATUS
// ======================================================

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const config =
    getStatusConfig(
      status
    );


  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            config.background,
        },
      ]}
    >
      <Ionicons
        name={
          config.icon
        }
        size={13}
        color={
          config.color
        }
      />


      <Text
        style={[
          styles.statusText,
          {
            color:
              config.color,
          },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}


// ======================================================
// STATUS CONFIG
// ======================================================

function getStatusConfig(
  status: string
): {
  color: string;
  background: string;
  icon:
    keyof typeof Ionicons.glyphMap;
} {
  switch (
    status
  ) {
    case 'Reviewing':
      return {
        color:
          '#B45309',
        background:
          '#FEF3C7',
        icon:
          'search-outline',
      };


    case 'Confirmed':
      return {
        color:
          '#0369A1',
        background:
          '#E0F2FE',
        icon:
          'checkmark-circle-outline',
      };


    case 'Printing':
      return {
        color:
          '#7C3AED',
        background:
          '#EDE9FE',
        icon:
          'print-outline',
      };


    case 'Ready':
      return {
        color:
          '#15803D',
        background:
          '#DCFCE7',
        icon:
          'bag-check-outline',
      };


    case 'Completed':
      return {
        color:
          COLORS.primary,
        background:
          '#D1FAE5',
        icon:
          'checkmark-done-circle-outline',
      };


    case 'Cancelled':
      return {
        color:
          COLORS.error,
        background:
          '#FEE2E2',
        icon:
          'close-circle-outline',
      };


    case 'Pending':

    default:
      return {
        color:
          '#B45309',
        background:
          '#FFF7ED',
        icon:
          'time-outline',
      };
  }
}


// ======================================================
// DATE
// ======================================================

function formatDate(
  dateString: string
) {
  try {
    return new Date(
      dateString
    ).toLocaleString(
      'en-LK',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',
      }
    );

  } catch {
    return dateString;
  }
}


// ======================================================
// FILE SIZE
// ======================================================

function formatFileSize(
  bytes: number
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }


  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1
    )} KB`;
  }


  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(
    1
  )} MB`;
}


// ======================================================
// STYLES
// ======================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        COLORS.backgroundSoft,
    },

    header: {
      height: 58,
      backgroundColor:
        COLORS.white,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    headerButton: {
      width: 42,
      height: 42,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    headerTitle: {
      flex: 1,
      textAlign:
        'center',
      fontSize: 18,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    loadingContainer: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    loadingText: {
      marginTop: 12,
      color:
        COLORS.textSecondary,
      fontSize: 12,
    },

    content: {
      padding: 14,
      paddingBottom: 45,
    },

    infoCard: {
      backgroundColor:
        COLORS.primary,
      borderRadius: 16,
      padding: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 12,
    },

    infoIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor:
        COLORS.white,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    infoContent: {
      flex: 1,
      marginLeft: 12,
    },

    infoTitle: {
      fontSize: 17,
      fontWeight:
        '900',
      color:
        COLORS.white,
    },

    infoText: {
      marginTop: 4,
      fontSize: 11,
      lineHeight: 16,
      color:
        COLORS.white,
      opacity: 0.9,
    },

    countBadge: {
      minWidth: 35,
      height: 35,
      paddingHorizontal: 8,
      borderRadius: 18,
      backgroundColor:
        COLORS.secondary,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    countBadgeText: {
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    createButton: {
      height: 48,
      borderRadius: 11,
      backgroundColor:
        COLORS.primary,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 7,
      marginBottom: 14,
    },

    createButtonText: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        COLORS.white,
    },

    requestCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 15,
      marginBottom: 14,
    },

    requestTop: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
      gap: 10,
    },

    requestNumberContainer: {
      flex: 1,
    },

    requestNumberLabel: {
      fontSize: 9,
      fontWeight:
        '800',
      color:
        COLORS.textSecondary,
    },

    requestNumber: {
      marginTop: 3,
      fontSize: 14,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    statusBadge: {
      minHeight: 29,
      paddingHorizontal: 9,
      borderRadius: 15,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 4,
    },

    statusText: {
      fontSize: 10,
      fontWeight:
        '900',
    },

    dateRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 5,
      marginTop: 9,
      marginBottom: 13,
    },

    dateText: {
      fontSize: 10,
      color:
        COLORS.textSecondary,
    },

    documentBox: {
      backgroundColor:
        COLORS.backgroundSoft,
      borderRadius: 12,
      padding: 11,
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 14,
    },

    documentIcon: {
      width: 43,
      height: 43,
      borderRadius: 10,
      backgroundColor:
        '#E8F5F0',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    documentInfo: {
      flex: 1,
      marginLeft: 10,
    },

    documentName: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
    },

    documentMeta: {
      marginTop: 3,
      fontSize: 10,
      color:
        COLORS.textSecondary,
    },

    openFileButton: {
      width: 38,
      height: 38,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    detailsGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      justifyContent:
        'space-between',
      rowGap: 10,
    },

    detailItem: {
      width: '48%',
      minHeight: 54,
      borderRadius: 10,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      flexDirection:
        'row',
      alignItems:
        'center',
      padding: 9,
    },

    detailInfo: {
      flex: 1,
      marginLeft: 7,
    },

    detailLabel: {
      fontSize: 8,
      fontWeight:
        '800',
      color:
        COLORS.textSecondary,
    },

    detailValue: {
      marginTop: 2,
      fontSize: 10,
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
    },

    noteBox: {
      marginTop: 13,
      padding: 11,
      borderRadius: 10,
      backgroundColor:
        '#E8F5F0',
      flexDirection:
        'row',
    },

    noteContent: {
      flex: 1,
      marginLeft: 8,
    },

    noteTitle: {
      fontSize: 10,
      fontWeight:
        '900',
      color:
        COLORS.primary,
    },

    noteText: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
      color:
        COLORS.textPrimary,
    },

    totalSection: {
      marginTop: 14,
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },

    totalTitle: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    totalNote: {
      marginTop: 3,
      fontSize: 8,
      color:
        COLORS.textSecondary,
    },

    totalAmount: {
      fontSize: 18,
      fontWeight:
        '900',
      color:
        COLORS.primary,
    },

    emptyContainer: {
      flexGrow: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 30,
    },

    emptyIcon: {
      width: 95,
      height: 95,
      borderRadius: 48,
      backgroundColor:
        '#E8F5F0',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    emptyTitle: {
      marginTop: 18,
      fontSize: 19,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    emptyText: {
      marginTop: 7,
      fontSize: 12,
      lineHeight: 18,
      textAlign:
        'center',
      color:
        COLORS.textSecondary,
    },

    newRequestButton: {
      marginTop: 20,
      height: 50,
      paddingHorizontal: 22,
      borderRadius: 11,
      backgroundColor:
        COLORS.primary,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 7,
    },

    newRequestButtonText: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        COLORS.white,
    },
  });