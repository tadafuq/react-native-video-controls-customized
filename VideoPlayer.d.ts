import {Component} from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import Video, {LoadError, VideoProperties} from 'react-native-video';

interface DuckNavigator {
  pop: () => void;
}

interface seekbarStyleProps {
  /** React Native StyleSheet object that is applied to the seekbar's track */
  track?: ViewStyle;
  /** React Native StyleSheet object that is applied to the seekbar's fill */
  fill?: ViewStyle;
  /** React Native StyleSheet object that is applied to the seekbar's container */
  container?: ViewStyle;
  /** React Native StyleSheet object that is applied to the handle */
  handle?: ViewStyle;
  /** React Native StyleSheet object that is applied to the handle's circle */
  circle?: ViewStyle;
}

interface VideoPlayerProperties extends VideoProperties {
  /** If true, clicking the fullscreen button will toggle the <Video /> component between cover/contain, set to false if you want to customize fullscreen behaviour */
  toggleResizeModeOnFullscreen?: boolean;
  /** The amountof time (in milliseconds) to animate the controls in and out. */
  controlAnimationTiming?: number;
  /** Tapping twice within this amount of time in milliseconds is considered a double tap. Single taps will not be actioned until this time has expired. */
  doubleTapTime?: number;
  /** Hide controls after X amount of time in milliseconds */
  controlTimeout?: number;
  /** If > 0, enable live scrubbing when moving the seek bar. The provided value is the minimum time step of the scrubbing in milliseconds. */
  scrubbing?: number;
  /** Show or hide the controls on first render */
  showOnStart?: boolean;
  /** React Native StyleSheet object that is appended to the <Video> component */
  videoStyle?: ViewStyle;
  /** When using the default React Native navigator and do not override the onBack function, you'll need to pass the navigator to the VideoPlayer for it to function */
  navigator?: DuckNavigator;
  /** Fill/handle colour of the seekbar */
  seekColor?: string;
  /** React Native StyleSheet object that is appended to the video's parent */
  style?: StyleProp<ViewStyle>;
  /** If true, single tapping anywhere on the video (other than a control) toggles between playing and paused. */
  tapAnywhereToPause?: boolean;
  /** Fired when the video enters fullscreen after the fullscreen button is pressed */
  onEnterFullscreen?: () => void;
  /** Fired when the video exits fullscreen after the fullscreen button is pressed */
  onExitFullscreen?: () => void;
  /** Fired when the controls disappear */
  onHideControls?: () => void;
  /** Fired when the controls appear */
  onShowControls?: () => void;
  /** Fired when an error is encountered when loading the video */
  onError?: (error: LoadError) => void;
  /** Fired when the video is paused after the play/pause button is pressed */
  onPause?: () => void;
  /** Fired when the video begins playing after the play/pause button is pressed */
  onPlay?: () => void;
  /** Function fired when back button is pressed, override if using custom navigation */
  onBack?: () => void;
  /** Fired when the video is complete */
  onEnd?: (autoplayEnabled: boolean) => void;
  /** Hide the fullscreen button */
  disableFullscreen?: boolean;
  /** Hide the play/pause toggle */
  disablePlayPause?: boolean;
  /** Hide the seekbar */
  disableSeekbar?: boolean;
  /** Hide the Volume control */
  disableVolume?: boolean;
  /** Hide the timer */
  disableTimer?: boolean;
  /** Hide the back button */
  disableBack?: boolean;
  /** Thumbnail URL to show instead of a loader */
  thumbnailUri?: string;
  /** React Native StyleSheet object that is applied to the thumbnail */
  thumbnailStyle?: StyleProp<ViewStyle>;
  /** Fired when the user presses on the video */
  onVideoPress?: () => void;
  /** If false, the handle of the seekbar will be hidden */
  showHandle?: boolean;
  /** React Native StyleSheet objects that are applied to the seekbar */
  seekbarStyle?: seekbarStyleProps;
  /** Fired when the video is ready to start playing */
  onReadyForDisplay?: () => void;
  /** Duration string to display on top of video before the video is loaded */
  durationText?: string | null;
  /** Should this video play */
  shouldPlay?: boolean;
  /** Should the loader animation play */
  playLoaderAnimation?: boolean;
  /** Should the remaining time be shown */
  showTimeRemaining?: boolean;
  /** Skip the video to the indicated second */
  seekToSecond?: number;
  /** Disable the special controls for the video screen */
  disableVideoScreenControls?: boolean;
  /** Fired when the fullscreen button is pressed */
  toggleFullScreen?: () => void;
  /** Should the controls be hidden */
  shouldHideControls?: boolean;
  /** Should the next video be played - combined with onEnd */
  autoplayEnabled?: boolean;
  /** Is the layout of the controls right to left */
  isRTL?: boolean;
  /** Function to set the watch percentage of the video */
  setWatchTime?: (time: number) => void;
  /** Should the player restart from the beginning */
  shouldRestart?: boolean;
  /** Support function to ensure that player doesn't repeatedly restart */
  resetShouldRestart?: () => void;
}

export default class VideoPlayer extends Component<VideoPlayerProperties> {
  /**
   * Seek to a time in the video.
   *
   * @param {number} time time to seek to in ms
   */
  seekTo(time?: number): void;
  /**
   * Exposing player object for the ref.
   */
  player: {
    /**
     * The ref of underlying Video coomponent from
     * 'react-native-video'.
     * Can be used for various imperative tasks.
     */
    ref: Video;
  };
}
