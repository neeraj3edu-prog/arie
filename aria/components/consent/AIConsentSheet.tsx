import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onAllow: () => void;
  onDecline: () => void;
};

type ServiceRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  company: string;
  what: string;
  why: string;
};

function ServiceRow({ icon, company, what, why }: ServiceRowProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(79,110,247,0.12)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ionicons name={icon} size={18} color="#4f6ef7" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#f0f0f5', fontSize: 14, fontWeight: '600', marginBottom: 2 }}>{company}</Text>
        <Text style={{ color: '#8a8aa0', fontSize: 13, lineHeight: 18 }}>
          <Text style={{ color: '#f0f0f5' }}>Receives: </Text>{what}
        </Text>
        <Text style={{ color: '#8a8aa0', fontSize: 13, lineHeight: 18, marginTop: 2 }}>{why}</Text>
      </View>
    </View>
  );
}

export function AIConsentSheet({ visible, onAllow, onDecline }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#13131a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>

          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(79,110,247,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="shield-checkmark-outline" size={26} color="#4f6ef7" />
            </View>
            <Text style={{ color: '#f0f0f5', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
              AI Features Use Your Data
            </Text>
            <Text style={{ color: '#8a8aa0', fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
              Voice input and receipt scanning send data to third-party services. Here's exactly what's shared and with whom.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

            <ServiceRow
              icon="mic-outline"
              company="Deepgram"
              what="your voice recording (audio)"
              why="Converts speech to text. Audio is not stored after transcription."
            />
            <ServiceRow
              icon="sparkles-outline"
              company="Anthropic (Claude AI)"
              what="transcribed text or typed input"
              why="Identifies tasks and expense amounts. Not used to train AI models."
            />
            <ServiceRow
              icon="camera-outline"
              company="Google (Document AI)"
              what="your receipt photo"
              why="Extracts store name, date, and line items. Image is not stored."
            />

            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

            <Text style={{ color: '#4a4a60', fontSize: 12, lineHeight: 18, marginBottom: 8 }}>
              None of your data is sold or used for advertising. You can still add tasks and expenses manually without using AI features. See our{' '}
              <Text style={{ color: '#4f6ef7' }}>Privacy Policy</Text>
              {' '}for full details.
            </Text>
          </ScrollView>

          {/* Buttons */}
          <Pressable
            onPress={onAllow}
            style={{ backgroundColor: '#4f6ef7', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Allow AI features"
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Allow AI Features</Text>
          </Pressable>

          <Pressable
            onPress={onDecline}
            style={{ paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="No thanks, use manual input only"
          >
            <Text style={{ color: '#8a8aa0', fontSize: 15 }}>No Thanks — I'll Add Manually</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
