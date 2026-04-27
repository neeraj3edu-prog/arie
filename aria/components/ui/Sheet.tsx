import {
  Modal,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useEffect } from 'react';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapHeight?: number;
};

const SPRING = { damping: 20, stiffness: 200 };

export function Sheet({ visible, onClose, children, snapHeight = 420 }: SheetProps) {
  const translateY = useSharedValue(snapHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SPRING);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = withSpring(snapHeight, SPRING);
    }
  }, [visible, snapHeight, translateY, backdropOpacity]);

  // On web Reanimated animated styles don't always run during Modal mount.
  // Use a plain opacity derived from `visible` as fallback.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > snapHeight * 0.35 || e.velocityY > 800) {
        backdropOpacity.value = withTiming(0, { duration: 150 });
        translateY.value = withSpring(snapHeight, SPRING, () => runOnJS(onClose)());
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Backdrop — use plain style on web so it's always visible */}
        <TouchableWithoutFeedback onPress={onClose} accessible={false}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                // On web ensure Reanimated opacity overrides; fallback is always opaque enough
                zIndex: 0,
              },
              Platform.OS !== 'web' ? backdropStyle : undefined,
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sheet panel */}
        <View style={{ flex: 1, justifyContent: 'flex-end', zIndex: 1 }}>
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                sheetStyle,
                {
                  height: snapHeight,
                  backgroundColor: '#13131a',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  overflow: 'hidden',
                },
              ]}
              accessibilityViewIsModal
            >
              {/* Drag handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' }} />
              </View>
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
