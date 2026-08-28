import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import {
    useMemo,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';

import {
    createPrintingRequest,
} from '../services/printingService';


// ======================================================
// TYPES
// ======================================================

type PrintType =
  | 'Black & White'
  | 'Colour';


type PaperSize =
  | 'A4'
  | 'A3';


type PrintSide =
  | 'Single Side'
  | 'Double Side';


type BindingType =
  | 'None'
  | 'Spiral Binding';


type LaminationType =
  | 'None'
  | 'Lamination';


// ======================================================
// TEMPORARY PRINTING PRICES
//
// Replace these later with Lucky Hub official prices.
// ======================================================

const PRICE = {
  blackWhiteA4: 6,
  colourA4: 25,
  a3Multiplier: 2,
  spiralBinding: 150,
  lamination: 100,
};


// ======================================================
// SCREEN
// ======================================================

export default function PrintingServiceScreen() {
  const router =
    useRouter();


  // ====================================================
  // FILE
  // ====================================================

  const [
    fileName,
    setFileName,
  ] =
    useState('');


  const [
    fileUri,
    setFileUri,
  ] =
    useState('');


  const [
    fileSize,
    setFileSize,
  ] =
    useState<
      number | null
    >(null);


  const [
    fileMimeType,
    setFileMimeType,
  ] =
    useState<
      string | null
    >(null);


  // ====================================================
  // OPTIONS
  // ====================================================

  const [
    printType,
    setPrintType,
  ] =
    useState<PrintType>(
      'Black & White'
    );


  const [
    paperSize,
    setPaperSize,
  ] =
    useState<PaperSize>(
      'A4'
    );


  const [
    printSide,
    setPrintSide,
  ] =
    useState<PrintSide>(
      'Single Side'
    );


  const [
    copies,
    setCopies,
  ] =
    useState(1);


  const [
    pageCount,
    setPageCount,
  ] =
    useState(1);


  const [
    binding,
    setBinding,
  ] =
    useState<BindingType>(
      'None'
    );


  const [
    lamination,
    setLamination,
  ] =
    useState<LaminationType>(
      'None'
    );


  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);


  // ====================================================
  // PICK DOCUMENT
  // ====================================================

  const pickDocument =
    async () => {
      try {
        const result =
          await DocumentPicker.getDocumentAsync({
            type: [
              'application/pdf',

              'application/msword',

              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

              'image/*',
            ],

            multiple:
              false,

            copyToCacheDirectory:
              true,
          });


        if (
          result.canceled
        ) {
          return;
        }


        const asset =
          result.assets[0];


        setFileName(
          asset.name
        );


        setFileUri(
          asset.uri
        );


        setFileSize(
          asset.size ??
            null
        );


        setFileMimeType(
          asset.mimeType ??
            null
        );

      } catch (
        error
      ) {
        console.error(
          'Document picker error:',
          error
        );


        Alert.alert(
          'File Error',
          'Unable to select the document.'
        );
      }
    };


  // ====================================================
  // FILE SIZE
  // ====================================================

  const formattedFileSize =
    useMemo(
      () => {
        if (
          !fileSize
        ) {
          return '';
        }


        if (
          fileSize <
          1024 *
            1024
        ) {
          return `${(
            fileSize /
            1024
          ).toFixed(
            1
          )} KB`;
        }


        return `${(
          fileSize /
          1024 /
          1024
        ).toFixed(
          1
        )} MB`;
      },
      [
        fileSize,
      ]
    );


  // ====================================================
  // PRINT RATE
  // ====================================================

  const printRate =
    useMemo(
      () => {
        let rate =
          printType ===
          'Colour'
            ? PRICE.colourA4
            : PRICE.blackWhiteA4;


        if (
          paperSize ===
          'A3'
        ) {
          rate *=
            PRICE.a3Multiplier;
        }


        return rate;
      },
      [
        printType,
        paperSize,
      ]
    );


  // ====================================================
  // CHARGEABLE PAGES
  // ====================================================

  const chargeablePages =
    useMemo(
      () => {
        if (
          printSide ===
          'Double Side'
        ) {
          return Math.ceil(
            pageCount /
              2
          );
        }


        return pageCount;
      },
      [
        pageCount,
        printSide,
      ]
    );


  // ====================================================
  // COSTS
  // ====================================================

  const printCost =
    useMemo(
      () =>
        printRate *
        chargeablePages *
        copies,
      [
        printRate,
        chargeablePages,
        copies,
      ]
    );


  const bindingCost =
    binding ===
    'Spiral Binding'
      ? PRICE.spiralBinding *
        copies
      : 0;


  const laminationCost =
    lamination ===
    'Lamination'
      ? PRICE.lamination *
        copies
      : 0;


  const total =
    printCost +
    bindingCost +
    laminationCost;


  // ====================================================
  // QUANTITY
  // ====================================================

  const decreaseCopies =
    () => {
      setCopies(
        current =>
          Math.max(
            1,
            current -
              1
          )
      );
    };


  const increaseCopies =
    () => {
      setCopies(
        current =>
          current +
          1
      );
    };


  const decreasePages =
    () => {
      setPageCount(
        current =>
          Math.max(
            1,
            current -
              1
          )
      );
    };


  const increasePages =
    () => {
      setPageCount(
        current =>
          current +
          1
      );
    };


  // ====================================================
  // RESET
  // ====================================================

  const resetForm =
    () => {
      setFileName(
        ''
      );


      setFileUri(
        ''
      );


      setFileSize(
        null
      );


      setFileMimeType(
        null
      );


      setPrintType(
        'Black & White'
      );


      setPaperSize(
        'A4'
      );


      setPrintSide(
        'Single Side'
      );


      setCopies(
        1
      );


      setPageCount(
        1
      );


      setBinding(
        'None'
      );


      setLamination(
        'None'
      );
    };


  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit =
    async () => {
      if (
        !fileUri ||
        !fileName
      ) {
        Alert.alert(
          'Document Required',
          'Please upload a document before submitting your printing request.'
        );


        return;
      }


      try {
        setSubmitting(
          true
        );


        const request =
          await createPrintingRequest({
            file: {
              uri:
                fileUri,

              name:
                fileName,

              mimeType:
                fileMimeType,

              size:
                fileSize,
            },

            printType,

            paperSize,

            printSide,

            pageCount,

            copies,

            binding,

            lamination,

            printCost,

            bindingCost,

            laminationCost,

            estimatedTotal:
              total,

            customerNotes:
              null,
          });


        resetForm();


        Alert.alert(
          'Printing Request Submitted',
          `Your printing request has been submitted successfully.

Request No:
${request.requestNumber}

Status:
${request.status}

Estimated Total:
Rs. ${request.estimatedTotal.toLocaleString()}`,
          [
            {
              text:
                'Done',
              style:
                'cancel',
            },

            {
              text:
                'View Requests',

              onPress:
                () =>
                  router.push(
                    '/printing-requests'
                  ),
            },
          ]
        );

      } catch (
        error: any
      ) {
        console.error(
          'Submit printing request error:',
          error
        );


        Alert.alert(
          'Submission Failed',
          error?.message ??
            'Unable to submit your printing request.'
        );

      } finally {
        setSubmitting(
          false
        );
      }
    };


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

      {/* HEADER */}

      <View
        style={
          styles.header
        }
      >
        <Pressable
          style={
            styles.headerButton
          }
          onPress={() =>
            router.back()
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
          Printing Service
        </Text>


        <Pressable
          style={
            styles.headerButton
          }
          onPress={() =>
            router.push(
              '/printing-requests'
            )
          }
        >
          <Ionicons
            name="receipt-outline"
            size={23}
            color={
              COLORS.primary
            }
          />
        </Pressable>
      </View>


      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >

        {/* HERO */}

        <View
          style={
            styles.heroCard
          }
        >
          <View
            style={
              styles.heroIcon
            }
          >
            <Ionicons
              name="print-outline"
              size={34}
              color={
                COLORS.primary
              }
            />
          </View>


          <View
            style={
              styles.heroInfo
            }
          >
            <Text
              style={
                styles.heroTitle
              }
            >
              Print with Lucky Hub
            </Text>


            <Text
              style={
                styles.heroText
              }
            >
              Upload your document and select your printing options.
            </Text>
          </View>
        </View>


        {/* MY REQUESTS */}

        <Pressable
          style={
            styles.myRequestsButton
          }
          onPress={() =>
            router.push(
              '/printing-requests'
            )
          }
        >
          <View
            style={
              styles.myRequestsIcon
            }
          >
            <Ionicons
              name="receipt-outline"
              size={23}
              color={
                COLORS.primary
              }
            />
          </View>


          <View
            style={
              styles.myRequestsInfo
            }
          >
            <Text
              style={
                styles.myRequestsTitle
              }
            >
              My Printing Requests
            </Text>


            <Text
              style={
                styles.myRequestsText
              }
            >
              View previous requests and printing status
            </Text>
          </View>


          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              COLORS.textSecondary
            }
          />
        </Pressable>


        {/* UPLOAD */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Upload Document
        </Text>


        <Pressable
          style={
            styles.uploadCard
          }
          onPress={
            pickDocument
          }
          disabled={
            submitting
          }
        >
          <View
            style={
              styles.uploadIcon
            }
          >
            <Ionicons
              name={
                fileName
                  ? 'document-text-outline'
                  : 'cloud-upload-outline'
              }
              size={36}
              color={
                COLORS.primary
              }
            />
          </View>


          {fileName ? (
            <>
              <Text
                style={
                  styles.fileName
                }
                numberOfLines={
                  2
                }
              >
                {fileName}
              </Text>


              {formattedFileSize ? (
                <Text
                  style={
                    styles.fileSize
                  }
                >
                  {
                    formattedFileSize
                  }
                </Text>
              ) : null}


              <Text
                style={
                  styles.changeFileText
                }
              >
                Tap to change document
              </Text>
            </>

          ) : (
            <>
              <Text
                style={
                  styles.uploadTitle
                }
              >
                Select Document
              </Text>


              <Text
                style={
                  styles.uploadText
                }
              >
                PDF, Word or Image
              </Text>
            </>
          )}
        </Pressable>


        {/* PRINT TYPE */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Print Type
        </Text>


        <View
          style={
            styles.optionRow
          }
        >
          <OptionButton
            label="Black & White"
            icon="document-text-outline"
            selected={
              printType ===
              'Black & White'
            }
            onPress={() =>
              setPrintType(
                'Black & White'
              )
            }
          />


          <OptionButton
            label="Colour"
            icon="color-palette-outline"
            selected={
              printType ===
              'Colour'
            }
            onPress={() =>
              setPrintType(
                'Colour'
              )
            }
          />
        </View>


        {/* PAPER */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Paper Size
        </Text>


        <View
          style={
            styles.optionRow
          }
        >
          <OptionButton
            label="A4"
            icon="document-outline"
            selected={
              paperSize ===
              'A4'
            }
            onPress={() =>
              setPaperSize(
                'A4'
              )
            }
          />


          <OptionButton
            label="A3"
            icon="document-outline"
            selected={
              paperSize ===
              'A3'
            }
            onPress={() =>
              setPaperSize(
                'A3'
              )
            }
          />
        </View>


        {/* SIDE */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Print Side
        </Text>


        <View
          style={
            styles.optionRow
          }
        >
          <OptionButton
            label="Single Side"
            icon="copy-outline"
            selected={
              printSide ===
              'Single Side'
            }
            onPress={() =>
              setPrintSide(
                'Single Side'
              )
            }
          />


          <OptionButton
            label="Double Side"
            icon="layers-outline"
            selected={
              printSide ===
              'Double Side'
            }
            onPress={() =>
              setPrintSide(
                'Double Side'
              )
            }
          />
        </View>


        {/* QUANTITY */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Quantity
        </Text>


        <View
          style={
            styles.quantityCard
          }
        >
          <QuantityRow
            label="Number of Pages"
            value={
              pageCount
            }
            onMinus={
              decreasePages
            }
            onPlus={
              increasePages
            }
          />


          <View
            style={
              styles.divider
            }
          />


          <QuantityRow
            label="Copies"
            value={
              copies
            }
            onMinus={
              decreaseCopies
            }
            onPlus={
              increaseCopies
            }
          />
        </View>


        {/* BINDING */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Binding
        </Text>


        <View
          style={
            styles.optionRow
          }
        >
          <OptionButton
            label="None"
            icon="close-circle-outline"
            selected={
              binding ===
              'None'
            }
            onPress={() =>
              setBinding(
                'None'
              )
            }
          />


          <OptionButton
            label="Spiral Binding"
            icon="book-outline"
            selected={
              binding ===
              'Spiral Binding'
            }
            onPress={() =>
              setBinding(
                'Spiral Binding'
              )
            }
          />
        </View>


        {/* LAMINATION */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Lamination
        </Text>


        <View
          style={
            styles.optionRow
          }
        >
          <OptionButton
            label="None"
            icon="close-circle-outline"
            selected={
              lamination ===
              'None'
            }
            onPress={() =>
              setLamination(
                'None'
              )
            }
          />


          <OptionButton
            label="Lamination"
            icon="albums-outline"
            selected={
              lamination ===
              'Lamination'
            }
            onPress={() =>
              setLamination(
                'Lamination'
              )
            }
          />
        </View>


        {/* SUMMARY */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Price Summary
        </Text>


        <View
          style={
            styles.summaryCard
          }
        >
          <SummaryRow
            label="Printing"
            value={`Rs. ${printCost.toLocaleString()}`}
          />


          <SummaryRow
            label="Binding"
            value={`Rs. ${bindingCost.toLocaleString()}`}
          />


          <SummaryRow
            label="Lamination"
            value={`Rs. ${laminationCost.toLocaleString()}`}
          />


          <View
            style={
              styles.summaryDivider
            }
          />


          <View
            style={
              styles.totalRow
            }
          >
            <Text
              style={
                styles.totalLabel
              }
            >
              Estimated Total
            </Text>


            <Text
              style={
                styles.totalValue
              }
            >
              Rs.{' '}
              {total.toLocaleString()}
            </Text>
          </View>


          <Text
            style={
              styles.priceNote
            }
          >
            Final price will be confirmed by Lucky Hub after checking the document.
          </Text>
        </View>


        {/* SUBMIT */}

        <Pressable
          style={[
            styles.submitButton,

            submitting &&
              styles.submitButtonDisabled,
          ]}
          onPress={
            handleSubmit
          }
          disabled={
            submitting
          }
        >
          {submitting ? (
            <>
              <ActivityIndicator
                size="small"
                color={
                  COLORS.white
                }
              />


              <Text
                style={
                  styles.submitButtonText
                }
              >
                UPLOADING...
              </Text>
            </>

          ) : (
            <>
              <Ionicons
                name="paper-plane-outline"
                size={20}
                color={
                  COLORS.white
                }
              />


              <Text
                style={
                  styles.submitButtonText
                }
              >
                SUBMIT PRINTING REQUEST
              </Text>
            </>
          )}
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}


// ======================================================
// OPTION BUTTON
// ======================================================

function OptionButton({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;

  icon:
    keyof typeof Ionicons.glyphMap;

  selected: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.optionButton,

        selected &&
          styles.optionButtonSelected,
      ]}
      onPress={
        onPress
      }
    >
      <Ionicons
        name={
          icon
        }
        size={22}
        color={
          selected
            ? COLORS.primary
            : COLORS.textSecondary
        }
      />


      <Text
        style={[
          styles.optionText,

          selected &&
            styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>


      <View
        style={[
          styles.radio,

          selected &&
            styles.radioSelected,
        ]}
      >
        {selected && (
          <View
            style={
              styles.radioInside
            }
          />
        )}
      </View>
    </Pressable>
  );
}


// ======================================================
// QUANTITY ROW
// ======================================================

function QuantityRow({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;

  value: number;

  onMinus: () => void;

  onPlus: () => void;
}) {
  return (
    <View
      style={
        styles.quantityRow
      }
    >
      <Text
        style={
          styles.quantityLabel
        }
      >
        {label}
      </Text>


      <View
        style={
          styles.quantityControls
        }
      >
        <Pressable
          style={
            styles.quantityButton
          }
          onPress={
            onMinus
          }
        >
          <Ionicons
            name="remove"
            size={18}
            color={
              COLORS.textPrimary
            }
          />
        </Pressable>


        <View
          style={
            styles.quantityValueBox
          }
        >
          <Text
            style={
              styles.quantityValue
            }
          >
            {value}
          </Text>
        </View>


        <Pressable
          style={
            styles.quantityButton
          }
          onPress={
            onPlus
          }
        >
          <Ionicons
            name="add"
            size={18}
            color={
              COLORS.textPrimary
            }
          />
        </Pressable>
      </View>
    </View>
  );
}


// ======================================================
// SUMMARY ROW
// ======================================================

function SummaryRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View
      style={
        styles.summaryRow
      }
    >
      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>


      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>
    </View>
  );
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
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    headerTitle: {
      flex: 1,
      fontSize: 19,
      fontWeight:
        '900',
      textAlign:
        'center',
      color:
        COLORS.textPrimary,
    },

    content: {
      padding: 14,
      paddingBottom: 50,
    },

    heroCard: {
      backgroundColor:
        COLORS.primary,
      borderRadius: 18,
      padding: 18,
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 12,
    },

    heroIcon: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor:
        COLORS.white,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    heroInfo: {
      flex: 1,
      marginLeft: 14,
    },

    heroTitle: {
      fontSize: 18,
      fontWeight:
        '900',
      color:
        COLORS.white,
    },

    heroText: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 18,
      color:
        COLORS.white,
      opacity: 0.9,
    },

    myRequestsButton: {
      minHeight: 72,
      backgroundColor:
        COLORS.white,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 13,
      marginBottom: 22,
    },

    myRequestsIcon: {
      width: 45,
      height: 45,
      borderRadius: 12,
      backgroundColor:
        '#E8F5F0',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    myRequestsInfo: {
      flex: 1,
      marginLeft: 11,
    },

    myRequestsTitle: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    myRequestsText: {
      marginTop: 4,
      fontSize: 10,
      color:
        COLORS.textSecondary,
    },

    sectionTitle: {
      marginTop: 6,
      marginBottom: 10,
      fontSize: 15,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    uploadCard: {
      minHeight: 150,
      backgroundColor:
        COLORS.white,
      borderRadius: 15,
      borderWidth: 1.5,
      borderStyle:
        'dashed',
      borderColor:
        COLORS.primary,
      alignItems:
        'center',
      justifyContent:
        'center',
      padding: 18,
      marginBottom: 22,
    },

    uploadIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        '#E8F5F0',
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    uploadTitle: {
      marginTop: 10,
      fontSize: 15,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    uploadText: {
      marginTop: 5,
      fontSize: 11,
      color:
        COLORS.textSecondary,
    },

    fileName: {
      marginTop: 10,
      fontSize: 14,
      textAlign:
        'center',
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
    },

    fileSize: {
      marginTop: 4,
      fontSize: 11,
      color:
        COLORS.textSecondary,
    },

    changeFileText: {
      marginTop: 6,
      fontSize: 11,
      fontWeight:
        '700',
      color:
        COLORS.primary,
    },

    optionRow: {
      flexDirection:
        'row',
      gap: 10,
      marginBottom: 22,
    },

    optionButton: {
      flex: 1,
      minHeight: 76,
      backgroundColor:
        COLORS.white,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 12,
      justifyContent:
        'center',
      position:
        'relative',
    },

    optionButtonSelected: {
      borderColor:
        COLORS.primary,
      backgroundColor:
        '#ECFDF5',
    },

    optionText: {
      marginTop: 7,
      paddingRight: 20,
      fontSize: 12,
      fontWeight:
        '800',
      color:
        COLORS.textSecondary,
    },

    optionTextSelected: {
      color:
        COLORS.primary,
    },

    radio: {
      position:
        'absolute',
      right: 10,
      top: 10,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor:
        COLORS.border,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    radioSelected: {
      borderColor:
        COLORS.primary,
    },

    radioInside: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        COLORS.primary,
    },

    quantityCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      paddingHorizontal: 14,
      marginBottom: 22,
    },

    quantityRow: {
      minHeight: 72,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    quantityLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
    },

    quantityControls: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    quantityButton: {
      width: 36,
      height: 36,
      borderRadius: 9,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    quantityValueBox: {
      width: 48,
      alignItems:
        'center',
    },

    quantityValue: {
      fontSize: 16,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
    },

    summaryCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 16,
      marginBottom: 20,
    },

    summaryRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      marginBottom: 12,
    },

    summaryLabel: {
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    summaryValue: {
      fontSize: 12,
      fontWeight:
        '800',
      color:
        COLORS.textPrimary,
    },

    summaryDivider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginVertical: 4,
    },

    totalRow: {
      marginTop: 12,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    totalLabel: {
      fontSize: 15,
      fontWeight:
        '900',
      color:
        COLORS.textPrimary,
    },

    totalValue: {
      fontSize: 21,
      fontWeight:
        '900',
      color:
        COLORS.primary,
    },

    priceNote: {
      marginTop: 12,
      fontSize: 10,
      lineHeight: 16,
      color:
        COLORS.textSecondary,
    },

    submitButton: {
      height: 54,
      borderRadius: 12,
      backgroundColor:
        COLORS.primary,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 8,
    },

    submitButtonDisabled: {
      opacity: 0.65,
    },

    submitButtonText: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        COLORS.white,
    },
  });