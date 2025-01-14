import React, {Component} from 'react';
import I18nManager from 'react-native';
import FastImage from 'react-native-fast-image';
import Video from 'react-native-video';
import {
  TouchableWithoutFeedback,
  TouchableHighlight,
  PanResponder,
  StyleSheet,
  Animated,
  SafeAreaView,
  Easing,
  Image,
  View,
  Text,
} from 'react-native';
import padStart from 'lodash/padStart';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default class VideoPlayer extends Component {
  static defaultProps = {
    toggleResizeModeOnFullscreen: true,
    controlAnimationTiming: 500,
    doubleTapTime: 130,
    playInBackground: false,
    playWhenInactive: false,
    resizeMode: 'contain',
    isFullscreen: false,
    showOnStart: true,
    paused: false,
    repeat: false,
    muted: false,
    volume: 1,
    title: '',
    rate: 1,
    showTimeRemaining: true,
    showHours: false,
    seekbarStyle: StyleSheet.create({}),
    durationText: '',
    shouldPlay: true,
    playLoaderAnimation: true,
    disableTimer: true,
    disableFullscreen: true,
    disablePlayPause: true,
    disableVideoScreenControls: true,
  };

  constructor(props) {
    super(props);

    /**
     * All of our values that are updated by the
     * methods and listeners in this class
     */
    this.state = {
      // Video
      resizeMode: this.props.resizeMode,
      paused: this.props.paused,
      muted: this.props.muted,
      volume: this.props.volume,
      rate: this.props.rate,
      // Controls

      isFullscreen:
        this.props.isFullScreen || this.props.resizeMode === 'cover' || false,
      showTimeRemaining: this.props.showTimeRemaining,
      showHours: this.props.showHours,
      volumeTrackWidth: 0,
      volumeFillWidth: 0,
      seekerFillWidth: 0,
      showControls: this.props.showOnStart,
      volumePosition: 0,
      seekerPosition: 0,
      volumeOffset: 0,
      seekerOffset: 0,
      seeking: false,
      originallyPaused: false,
      scrubbing: false,
      loading: true,
      currentTime: 0,
      error: false,
      duration: 0,
      shouldHideControls: this.props.shouldHideControls,
      showHandle: this.props.showHandle,
      durationText: this.props.durationText,
      hasInitializedSeek: false,
    };

    /**
     * Any options that can be set at init.
     */
    this.opts = {
      playWhenInactive: this.props.playWhenInactive,
      playInBackground: this.props.playInBackground,
      repeat: this.props.repeat,
      title: this.props.title,
    };

    /**
     * Our app listeners and associated methods
     */
    this.events = {
      onError: this.props.onError || this._onError.bind(this),
      onBack: this.props.onBack || this._onBack.bind(this),
      onEnd: this._onEnd.bind(this),
      onScreenTouch: this._onScreenTouch.bind(this),
      onEnterFullscreen: this.props.onEnterFullscreen,
      onExitFullscreen: this.props.onExitFullscreen,
      onShowControls: this.props.onShowControls,
      onHideControls: this.props.onHideControls,
      onLoadStart: this._onLoadStart.bind(this),
      onProgress: this._onProgress.bind(this),
      onSeek: this._onSeek.bind(this),
      onLoad: this._onLoad.bind(this),
      onReadyForDisplay: this._onReadyForDisplay.bind(this),
      onPause: this.props.onPause,
      onPlay: this.props.onPlay,
      onVideoPress: this._onVideoPress.bind(this),
    };

    /**
     * Functions used throughout the application
     */
    this.methods = {
      toggleFullscreen: this._toggleFullscreen.bind(this),
      togglePlayPause: this._togglePlayPause.bind(this),
      toggleControls: this._toggleControls.bind(this),
      toggleTimer: this._toggleTimer.bind(this),
      toggleMute: this._toggleMute.bind(this),
      fastForward: this._fastForward.bind(this),
      fastBackward: this._fastBackward.bind(this),
      restartVideo: this._restartVideo.bind(this),
      goToEnd: this._goToEnd.bind(this),
    };

    /**
     * Player information
     */
    this.player = {
      controlTimeoutDelay: this.props.controlTimeout || 15000,
      volumePanResponder: PanResponder,
      seekPanResponder: PanResponder,
      controlTimeout: null,
      tapActionTimeout: null,
      volumeWidth: 150,
      iconOffset: 0,
      seekerWidth: 0,
      ref: Video,
      scrubbingTimeStep: this.props.scrubbing || 0,
      tapAnywhereToPause: this.props.tapAnywhereToPause,
    };

    /**
     * Various animations
     */
    const initialValue = this.props.showOnStart ? 1 : 0;

    this.animations = {
      bottomControl: {
        marginBottom: new Animated.Value(0),
        opacity: new Animated.Value(initialValue),
      },
      topControl: {
        marginTop: new Animated.Value(0),
        opacity: new Animated.Value(initialValue),
      },
      video: {
        opacity: new Animated.Value(1),
      },
      loader: {
        rotate: new Animated.Value(0),
        MAX_VALUE: 360,
      },
      volume: {
        opacity: new Animated.Value(0.8),
      },
      videoScreenControlsContainer: {
        marginBottom: new Animated.Value(0),
        opacity: new Animated.Value(initialValue),
      },
    };

    /**
     * Various styles that be added...
     */
    this.styles = {
      videoStyle: this.props.videoStyle || {},
      containerStyle: this.props.style || {},
      thumbnailStyle: this.props.thumbnailStyle || {},
    };
  }

  componentDidUpdate = prevProps => {
    const {isFullscreen} = this.props;

    if (prevProps.isFullscreen !== isFullscreen) {
      this.setState({
        isFullscreen,
      });
    }
  };
  /**
    | -------------------------------------------------------
    | Events
    | -------------------------------------------------------
    |
    | These are the events that the <Video> component uses
    | and can be overridden by assigning it as a prop.
    | It is suggested that you override onEnd.
    |
    */

  /**
   * When load starts we display a loading icon
   * and show the controls.
   * If the user wants to display a thumbnail instead,
   * the animation does not start.
   */
  _onLoadStart() {
    let state = this.state;
    state.loading = true;
    if (this.props.playLoaderAnimation && !this.props.thumbnailUri) {
      this.loadAnimation();
    }
    this.setState(state);

    if (typeof this.props.onLoadStart === 'function') {
      this.props.onLoadStart(...arguments);
    }
  }

  /**
   * When load is finished we set the
   * video duration.
   *
   * @param {object} data The video meta data
   */
  _onLoad(data = {}) {
    let state = this.state;
    state.duration = data.duration;
    this.setState(state);

    if (typeof this.props.onLoad === 'function') {
      this.props.onLoad(...arguments);
    }
  }

  /**
   * When the video is ready to be displayed we hide the load icon/thumbnail
   * and hide the controls. Also, seek to the required value.
   */
  _onReadyForDisplay() {
    let state = this.state;
    state.loading = false;
    this.volumeAnimation();

    if (state.showControls) {
      this.setControlTimeout();
    }

    if (this.props.seekToSecond && !state.hasInitializedSeek) {
      state.hasInitializedSeek = true;
      this.seekTo(parseFloat(this.props.seekToSecond));
    }

    if (this.props.shouldRestart) {
      this.seekTo(0);
      this.props.resetShouldRestart();
    }

    if (typeof this.props.onReadyForDisplay === 'function') {
      this.props.onReadyForDisplay(...arguments);
    }
    this.setState(state);
  }

  /**
   * For onprogress we fire listeners that
   * update our seekbar and timer.
   *
   * @param {object} data The video meta data
   */
  _onProgress(data = {}) {
    let state = this.state;
    if (!state.scrubbing) {
      state.currentTime = data.currentTime;
      if(typeof this.props.setWatchTime === 'function') {
        this.props.setWatchTime(state.currentTime);
      }
      if (!state.seeking) {
        const position = this.calculateSeekerPosition();
        this.setSeekerPosition(position);
      }

      if (typeof this.props.onProgress === 'function') {
        this.props.onProgress(...arguments);
      }

      if (state.error) {
        state.error = false;
      }

      this.setState(state);
    }
  }

  /**
   * For onSeek we clear scrubbing if set.
   *
   * @param {object} data The video meta data
   */
  _onSeek(data = {}) {
    let state = this.state;
    if (state.scrubbing) {
      state.scrubbing = false;
      state.currentTime = data.currentTime;

      // Seeking may be false here if the user released the seek bar while the player was still processing
      // the last seek command. In this case, perform the steps that have been postponed.
      if (!state.seeking) {
        this.setControlTimeout();
        state.paused = state.originallyPaused;
      }

      this.setState(state);
    }
  }

  /**
   * It is suggested that you override this
   * command so your app knows what to do.
   * Either close the video or go to a
   * new page.
   */
  _onEnd() {
    if (typeof this.props.onEnd === 'function') {
      let state = this.state;
      state.paused = true;
      this.setState(state);
      this.props.onEnd(this.props.autoplayEnabled);
    }
  }

  /**
   * Set the error state to true which then
   * changes our renderError function
   *
   * @param {object} err  Err obj returned from <Video> component
   */
  _onError(err) {
    console.error('Error detected from video component: ', err);
    let state = this.state;
    state.error = true;
    state.loading = false;
    this.setState(state);
  }

  /**
   * This is a single and double tap listener
   * when the user taps the screen anywhere.
   * One tap toggles controls and/or toggles pause,
   * two toggles fullscreen mode.
   */
  _onScreenTouch() {
    if (this.player.tapActionTimeout) {
      clearTimeout(this.player.tapActionTimeout);
      this.player.tapActionTimeout = 0;
      this.methods.toggleFullscreen();
      const state = this.state;
      if (state.showControls) {
        this.resetControlTimeout();
      }
    } else {
      this.player.tapActionTimeout = setTimeout(() => {
        const state = this.state;
        if (this.player.tapAnywhereToPause && state.showControls) {
          this.methods.togglePlayPause();
          this.resetControlTimeout();
        } else {
          this.methods.toggleControls();
        }
        this.player.tapActionTimeout = 0;
      }, this.props.doubleTapTime);
    }
  }

  /**
   * This function triggers when the video is pressed
   */
  _onVideoPress() {
    if (typeof this.props.onVideoPress === 'function') {
      this.props.onVideoPress();
    } else {
      this.events.onScreenTouch();
    }
  }

  /**
    | -------------------------------------------------------
    | Methods
    | -------------------------------------------------------
    |
    | These are all of our functions that interact with
    | various parts of the class. Anything from
    | calculating time remaining in a video
    | to handling control operations.
    |
    */

  /**
   * Set a timeout when the controls are shown
   * that hides them after a length of time.
   * Default is 15s
   * only in the case shouldHideControls is true
   */
  setControlTimeout() {
    if (this.state.shouldHideControls) {
      this.player.controlTimeout = setTimeout(() => {
        this._hideControls();
      }, this.player.controlTimeoutDelay);
    }
  }

  /**
   * Clear the hide controls timeout.
   */
  clearControlTimeout() {
    clearTimeout(this.player.controlTimeout);
  }

  /**
   * Reset the timer completely
   */
  resetControlTimeout() {
    this.clearControlTimeout();
    this.setControlTimeout();
  }

  /**
   * Animation to hide the volume background
   * after a time delay
   */
  volumeAnimation() {
    Animated.sequence([
      Animated.delay(6000),
      Animated.timing(this.animations.volume.opacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  }

  /**
   * Animation to hide controls. We fade the
   * display to 0 then move them off the
   * screen so they're not interactable
   */
  hideControlAnimation() {
    Animated.parallel([
      Animated.timing(this.animations.topControl.opacity, {
        toValue: 0,
        duration: this.props.controlAnimationTiming,
        useNativeDriver: false,
      }),
      Animated.timing(this.animations.topControl.marginTop, {
        toValue: -100,
        duration: this.props.controlAnimationTiming,
        useNativeDriver: false,
      }),
      Animated.timing(this.animations.bottomControl.opacity, {
        toValue: 0,
        duration: this.props.controlAnimationTiming,
        useNativeDriver: false,
      }),
      Animated.timing(this.animations.bottomControl.marginBottom, {
        toValue: -100,
        duration: this.props.controlAnimationTiming,
        useNativeDriver: false,
      }),
      Animated.timing(this.animations.videoScreenControlsContainer.opacity, {
        toValue: 0,
        duration: this.props.controlAnimationTiming,
        useNativeDriver: false,
      }),
      Animated.timing(
        this.animations.videoScreenControlsContainer.marginBottom,
        {
          toValue: -100,
          duration: this.props.controlAnimationTiming,
          useNativeDriver: false,
        },
      ),
    ]).start();
  }

  /**
   * Animation to show controls...opposite of
   * above...move onto the screen and then
   * fade in.
   */
  showControlAnimation() {
    Animated.parallel([
      Animated.timing(this.animations.topControl.opacity, {
        toValue: 1,
        useNativeDriver: false,
        duration: this.props.controlAnimationTiming,
      }),
      Animated.timing(this.animations.topControl.marginTop, {
        toValue: 0,
        useNativeDriver: false,
        duration: this.props.controlAnimationTiming,
      }),
      Animated.timing(this.animations.bottomControl.opacity, {
        toValue: 1,
        useNativeDriver: false,
        duration: this.props.controlAnimationTiming,
      }),
      Animated.timing(this.animations.bottomControl.marginBottom, {
        toValue: 0,
        useNativeDriver: false,
        duration: this.props.controlAnimationTiming,
      }),
      Animated.timing(this.animations.videoScreenControlsContainer.opacity, {
        toValue: 1,
        useNativeDriver: false,
        duration: this.props.controlAnimationTiming,
      }),
      Animated.timing(
        this.animations.videoScreenControlsContainer.marginBottom,
        {
          toValue: 0,
          useNativeDriver: false,
          duration: this.props.controlAnimationTiming,
        },
      ),
    ]).start();
  }

  /**
   * Loop animation to spin loader icon. If not loading then stop loop.
   */
  loadAnimation() {
    if (this.state.loading) {
      Animated.sequence([
        Animated.timing(this.animations.loader.rotate, {
          toValue: this.animations.loader.MAX_VALUE,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(this.animations.loader.rotate, {
          toValue: 0,
          duration: 0,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]).start(this.loadAnimation.bind(this));
    }
  }

  /**
   * Function to hide the controls. Sets our
   * state then calls the animation.
   */
  _hideControls() {
    if (this.mounted) {
      let state = this.state;
      state.showControls = false;
      this.hideControlAnimation();
      typeof this.events.onHideControls === 'function' &&
        this.events.onHideControls();
      this.setState(state);
    }
  }

  /**
   * Function to toggle controls based on
   * current state.
   */
  _toggleControls() {
    let state = this.state;
    state.showControls = !state.showControls;

    if (state.showControls) {
      this.showControlAnimation();
      this.setControlTimeout();
      typeof this.events.onShowControls === 'function' &&
        this.events.onShowControls();
    } else {
      this.hideControlAnimation();
      this.clearControlTimeout();
      typeof this.events.onHideControls === 'function' &&
        this.events.onHideControls();
    }

    this.setState(state);
  }

  /**
   * Toggle fullscreen changes resizeMode on
   * the <Video> component then updates the
   * isFullscreen state.
   */
  _toggleFullscreen() {
    let state = this.state;

    state.isFullscreen = !state.isFullscreen;

    if (this.props.toggleResizeModeOnFullscreen) {
      state.resizeMode = state.isFullscreen === true ? 'cover' : 'contain';
    }

    this._toggleControls();
    
    if (typeof this.props.toggleFullScreen === 'function') {
      this.props.toggleFullScreen();
    }

    if (state.isFullscreen) {
      typeof this.events.onEnterFullscreen === 'function' &&
        this.events.onEnterFullscreen();
    } else {
      typeof this.events.onExitFullscreen === 'function' &&
        this.events.onExitFullscreen();
    }

    this.setState(state);
  }

  /**
   * Toggle playing state on <Video> component
   */
  _togglePlayPause() {
    let state = this.state;
    state.paused = !state.paused;

    if (state.paused) {
      typeof this.events.onPause === 'function' && this.events.onPause();
    } else {
      typeof this.events.onPlay === 'function' && this.events.onPlay();
    }

    this.setState(state);
  }

  /**
   * Toggle between showing time remaining or
   * video duration in the timer control
   */
  _toggleTimer() {
    let state = this.state;
    state.showTimeRemaining = !state.showTimeRemaining;
    this.setState(state);
  }

  /**
   * Toggle the video volume on and off
   */
  _toggleMute() {
    let state = this.state;
    state.muted = !state.muted;
    this.setState(state);
  }

  /**
   * The default 'onBack' function pops the navigator
   * and as such the video player requires a
   * navigator prop by default.
   */
  _onBack() {
    if (this.props.navigator && this.props.navigator.pop) {
      this.props.navigator.pop();
    } else {
      console.warn(
        'Warning: _onBack requires navigator property to function. Either modify the onBack prop or pass a navigator prop',
      );
    }
  }

  /**
   * Fast forward 10 seconds in time.
   */
  _fastForward() {
    let state = this.state;
    this.seekTo(state.currentTime + 15);
  }

  /**
   * Fast backwards 10 seconds in time.
   */
  _fastBackward() {
    let state = this.state;
    this.seekTo(state.currentTime - 15);
  }

  /**
   * Restart the video from the beginning.
   */
  _restartVideo() {
    let state = this.state;
    this.seekTo(0);
    state.paused = false;
    this.setState(state);
  }

  /**
   * Seek to the end of the video.
   */
  _goToEnd() {
    let state = this.state;
    this.seekTo(state.duration);
  }

  /**
   * Calculate the time to show in the timer area
   * based on if they want to see time remaining
   * or duration. Formatted to look as 00:00.
   */
  calculateTime() {
    if (this.state.showTimeRemaining) {
      const time = this.state.duration - this.state.currentTime;
      return `-${this.formatTime(time)}`;
    }

    return this.formatTime(this.state.currentTime);
  }

  /**
   * Format a time string as mm:ss
   *
   * @param {int} time time in milliseconds
   * @return {string} formatted time string in mm:ss format
   */
  formatTime(time = 0) {
    const symbol = this.state.showRemainingTime ? '-' : '';
    time = Math.min(Math.max(time, 0), this.state.duration);

    if (!this.state.showHours) {
      const formattedMinutes = padStart(Math.floor(time / 60).toFixed(0), 2, 0);
      const formattedSeconds = padStart(Math.floor(time % 60).toFixed(0), 2, 0);

      return `${symbol}${formattedMinutes}:${formattedSeconds}`;
    }

    const formattedHours = padStart(Math.floor(time / 3600).toFixed(0), 2, 0);
    const formattedMinutes = padStart(
      (Math.floor(time / 60) % 60).toFixed(0),
      2,
      0,
    );
    const formattedSeconds = padStart(Math.floor(time % 60).toFixed(0), 2, 0);

    return `${symbol}${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }

  /**
   * Set the position of the seekbar's components
   * (both fill and handle) according to the
   * position supplied.
   *
   * @param {float} position position in px of seeker handle}
   */
  setSeekerPosition(position = 0) {
    let state = this.state;
    position = this.constrainToSeekerMinMax(position);

    state.seekerFillWidth = position;
    state.seekerPosition = position;

    if (!state.seeking) {
      state.seekerOffset = position;
    }

    this.setState(state);
  }

  /**
   * Constrain the location of the seeker to the
   * min/max value based on how big the
   * seeker is.
   *
   * @param {float} val position of seeker handle in px
   * @return {float} constrained position of seeker handle in px
   */
  constrainToSeekerMinMax(val = 0) {
    if (val <= 0) {
      return 0;
    } else if (val >= this.player.seekerWidth) {
      return this.player.seekerWidth;
    }
    return val;
  }

  /**
   * Calculate the position that the seeker should be
   * at along its track.
   *
   * @return {float} position of seeker handle in px based on currentTime
   */
  calculateSeekerPosition() {
    const percent = this.state.currentTime / this.state.duration;
    return this.player.seekerWidth * percent;
  }

  /**
   * Return the time that the video should be at
   * based on where the seeker handle is.
   *
   * @return {float} time in ms based on seekerPosition.
   */
  calculateTimeFromSeekerPosition() {
    const percent = this.state.seekerPosition / this.player.seekerWidth;
    return this.state.duration * percent;
  }

  /**
   * Seek to a time in the video.
   *
   * @param {float} time time to seek to in ms
   */
  seekTo(time = 0) {
    let state = this.state;
    state.currentTime = time;
    this.player.ref.seek(time);
    this.setState(state);
  }

  /**
   * Set the position of the volume slider
   *
   * @param {float} position position of the volume handle in px
   */
  setVolumePosition(position = 0) {
    let state = this.state;
    position = this.constrainToVolumeMinMax(position);
    state.volumePosition = position + this.player.iconOffset;
    state.volumeFillWidth = position;

    state.volumeTrackWidth = this.player.volumeWidth - state.volumeFillWidth;

    if (state.volumeFillWidth < 0) {
      state.volumeFillWidth = 0;
    }

    if (state.volumeTrackWidth > 150) {
      state.volumeTrackWidth = 150;
    }

    this.setState(state);
  }

  /**
   * Constrain the volume bar to the min/max of
   * its track's width.
   *
   * @param {float} val position of the volume handle in px
   * @return {float} contrained position of the volume handle in px
   */
  constrainToVolumeMinMax(val = 0) {
    if (val <= 0) {
      return 0;
    } else if (val >= this.player.volumeWidth + 9) {
      return this.player.volumeWidth + 9;
    }
    return val;
  }

  /**
   * Get the volume based on the position of the
   * volume object.
   *
   * @return {float} volume level based on volume handle position
   */
  calculateVolumeFromVolumePosition() {
    return this.state.volumePosition / this.player.volumeWidth;
  }

  /**
   * Get the position of the volume handle based
   * on the volume
   *
   * @return {float} volume handle position in px based on volume
   */
  calculateVolumePositionFromVolume() {
    return this.player.volumeWidth * this.state.volume;
  }

  /**
    | -------------------------------------------------------
    | React Component functions
    | -------------------------------------------------------
    |
    | Here we're initializing our listeners and getting
    | the component ready using the built-in React
    | Component methods
    |
    */

  /**
   * Before mounting, init our seekbar and volume bar
   * pan responders.
   */
  UNSAFE_componentWillMount() {
    this.initSeekPanResponder();
    this.initVolumePanResponder();
  }

  /**
   * To allow basic playback management from the outside
   * we have to handle possible props changes to state changes
   */
  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.state.paused !== nextProps.paused) {
      this.setState({
        paused: nextProps.paused,
      });
    }

    if (this.styles.videoStyle !== nextProps.videoStyle) {
      this.styles.videoStyle = nextProps.videoStyle;
    }

    if (this.styles.containerStyle !== nextProps.style) {
      this.styles.containerStyle = nextProps.style;
    }

    if (this.styles.thumbnailStyle !== nextProps.style) {
      this.styles.thumbnailStyle = nextProps.style;
    }
  }

  /**
   * Upon mounting, calculate the position of the volume
   * bar based on the volume property supplied to it.
   */
  componentDidMount() {
    const position = this.calculateVolumePositionFromVolume();
    let state = this.state;
    this.setVolumePosition(position);
    state.volumeOffset = position;
    this.mounted = true;

    this.setState(state);
  }

  /**
   * When the component is about to unmount kill the
   * timeout less it fire in the prev/next scene
   */
  componentWillUnmount() {
    this.mounted = false;
    this.clearControlTimeout();
  }

  /**
   * Get our seekbar responder going
   */
  initSeekPanResponder() {
    this.player.seekPanResponder = PanResponder.create({
      // Ask to be the responder.
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,

      /**
       * When we start the pan tell the machine that we're
       * seeking. This stops it from updating the seekbar
       * position in the onProgress listener.
       */
      onPanResponderGrant: (evt, gestureState) => {
        let state = this.state;
        this.clearControlTimeout();
        const position = evt.nativeEvent.locationX;
        this.setSeekerPosition(position);
        state.seeking = true;
        state.originallyPaused = state.paused;
        state.scrubbing = false;
        if (this.player.scrubbingTimeStep > 0) {
          state.paused = true;
        }
        this.setState(state);
      },

      /**
       * When panning, update the seekbar position, duh.
       */
      onPanResponderMove: (evt, gestureState) => {
        const position = this.state.seekerOffset + gestureState.dx;
        this.setSeekerPosition(position);
        let state = this.state;

        if (
          this.player.scrubbingTimeStep > 0 &&
          !state.loading &&
          !state.scrubbing
        ) {
          const time = this.calculateTimeFromSeekerPosition();
          const timeDifference = Math.abs(state.currentTime - time) * 1000;

          if (
            time < state.duration &&
            timeDifference >= this.player.scrubbingTimeStep
          ) {
            state.scrubbing = true;

            this.setState(state);
            setTimeout(() => {
              this.player.ref.seek(time, this.player.scrubbingTimeStep);
            }, 1);
          }
        }
      },

      /**
       * On release we update the time and seek to it in the video.
       * If you seek to the end of the video we fire the
       * onEnd callback
       */
      onPanResponderRelease: (evt, gestureState) => {
        const time = this.calculateTimeFromSeekerPosition();
        let state = this.state;
        if (time >= state.duration && !state.loading) {
          state.paused = true;
          this.events.onEnd();
        } else if (state.scrubbing) {
          state.seeking = false;
        } else {
          this.seekTo(time);
          this.setControlTimeout();
          state.paused = state.originallyPaused;
          state.seeking = false;
        }
        this.setState(state);
      },
    });
  }

  /**
   * Initialize the volume pan responder.
   */
  initVolumePanResponder() {
    this.player.volumePanResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onPanResponderGrant: (evt, gestureState) => {
        this.clearControlTimeout();
      },

      /**
       * Update the volume as we change the position.
       * If we go to 0 then turn on the mute prop
       * to avoid that weird static-y sound.
       */
      onPanResponderMove: (evt, gestureState) => {
        let state = this.state;
        const position = this.state.volumeOffset + gestureState.dx;

        this.setVolumePosition(position);
        state.volume = this.calculateVolumeFromVolumePosition();

        if (state.volume <= 0) {
          state.muted = true;
        } else {
          state.muted = false;
        }

        this.setState(state);
      },

      /**
       * Update the offset...
       */
      onPanResponderRelease: (evt, gestureState) => {
        let state = this.state;
        state.volumeOffset = state.volumePosition;
        this.setControlTimeout();
        this.setState(state);
      },
    });
  }

  /**
    | -------------------------------------------------------
    | Rendering
    | -------------------------------------------------------
    |
    | This section contains all of our render methods.
    | In addition to the typical React render func
    | we also have all the render methods for
    | the controls.
    |
    */

  /**
   * Standard render control function that handles
   * everything except the sliders. Adds a
   * consistent <TouchableHighlight>
   * wrapper and styling.
   */
  renderControl(children, callback, style = {}) {
    return (
      <TouchableHighlight
        underlayColor="transparent"
        activeOpacity={0.3}
        onPress={() => {
          this.resetControlTimeout();
          callback();
        }}
        style={[styles.controls.control, style]}>
        {children}
      </TouchableHighlight>
    );
  }

  /**
   * Renders an empty control, used to disable a control without breaking the view layout.
   */
  renderNullControl() {
    return <View style={[styles.controls.control]} />;
  }

  /**
   * Groups the top bar controls together in an animated
   * view and spaces them out.
   */
  renderTopControls() {
    if (this.state.error) {
      return null;
    }
    // const backControl = this.props.disableBack
    // ? this.renderNullControl()
    // : this.renderBack();
    const volumeControl = this.props.disableVolume
      ? this.renderNullControl()
      : this.renderVolume();
    // const fullscreenControl = this.props.disableFullscreen
    //   ? this.renderNullControl()
    //   : this.renderFullscreen();

    return (
      <Animated.View
        style={[
          styles.controls.top,
          {
            opacity: this.animations.topControl.opacity,
            marginTop: this.animations.topControl.marginTop,
          },
        ]}>
        <SafeAreaView>{volumeControl}</SafeAreaView>
        {/* <ImageBackground
          source={require('./assets/img/top-vignette.png')}
          imageStyle={[styles.controls.vignette]}>
        </ImageBackground> */}
      </Animated.View>
    );
  }

  /**
   * Back button control
   */
  renderBack() {
    return this.renderControl(
      <Image
        source={require('./assets/img/back.png')}
        style={styles.controls.back}
      />,
      this.events.onBack,
      styles.controls.back,
    );
  }

  /**
   * Render the volume slider and attach the pan handlers
   */
  renderVolume() {
    return this.renderControl(
      <View>
        <Animated.View
          style={{
            ...styles.volume.iconBackground,
            opacity: this.animations.volume.opacity,
          }}
        />
        <MaterialCommunityIcons
          name={this.state.muted ? 'volume-off' : 'volume-high'}
          color={'#fff'}
          size={20}
          style={styles.volume.icon}
        />
      </View>,
      this.methods.toggleMute,
      styles.controls.volume,
    );
  }

  /**
   * Render fullscreen toggle and set icon based on the fullscreen state.
   */
  renderFullscreen() {
    let source =
      this.state.isFullscreen === true
        ? require('./assets/img/shrink.png')
        : require('./assets/img/expand.png');
    return this.renderControl(
      <Image source={source} />,
      this.methods.toggleFullscreen,
      styles.controls.fullscreen,
    );
  }

  /**
   * Render bottom control group and wrap it in a holder
   */
  renderBottomControls() {
    if (this.state.error) {
      return null;
    }
    // const timerControl = this.props.disableTimer
    //   ? this.renderNullControl()
    //   : this.renderTimer();
    const seekbarControl = this.props.disableSeekbar
      ? this.renderNullControl()
      : this.renderSeekbar();
    // const playPauseControl = this.props.disablePlayPause
    //   ? this.renderNullControl()
    //   : this.renderPlayPause();

    return (
      <Animated.View
        style={[
          // styles.controls.bottom,
          {
            opacity: this.animations.bottomControl.opacity,
            marginBottom: this.animations.bottomControl.marginBottom,
          },
        ]}>
        {seekbarControl}
        {/*<ImageBackground
          source={require('./assets/img/bottom-vignette.png')}
          imageStyle={[styles.controls.vignette]}>
           <SafeAreaView
            style={[styles.controls.row, styles.controls.bottomControlGroup]}>
            {playPauseControl}
            {timerControl}
          </SafeAreaView>
        </ImageBackground>*/}
      </Animated.View>
    );
  }

  /**
   * Render the seekbar and attach its handlers
   */
  renderSeekbar() {
    return (
      <View
        style={[styles.seekbar.container, this.props.seekbarStyle?.container]}
        collapsable={false}
        {...this.player.seekPanResponder.panHandlers}>
        <View
          style={[styles.seekbar.track, this.props.seekbarStyle?.track]}
          onLayout={event =>
            (this.player.seekerWidth = event.nativeEvent.layout.width)
          }
          pointerEvents={'none'}>
          <View
            style={[
              styles.seekbar.fill,
              {
                width: this.state.seekerFillWidth,
                backgroundColor: this.props.seekColor || '#FFF',
              },
              this.props.seekbarStyle?.fill,
            ]}
            pointerEvents={'none'}
          />
        </View>
        {this.state.showHandle && (
          <View
            style={[
              styles.seekbar.handle,
              this.props.seekbarStyle?.handle,
              {left: this.state.seekerPosition},
            ]}
            pointerEvents={'none'}>
            <View
              style={[
                styles.seekbar.circle,
                this.props.seekbarStyle?.circle,
                {backgroundColor: this.props.seekColor || '#FFF'},
              ]}
              pointerEvents={'none'}
            />
          </View>
        )}
      </View>
    );
  }

  /**
   * Render the play/pause button and show the respective icon
   */
  renderPlayPause() {
    let source =
      this.state.paused === true
        ? require('./assets/img/play.png')
        : require('./assets/img/pause.png');
    return this.renderControl(
      <Image source={source} />,
      this.methods.togglePlayPause,
      styles.controls.playPause,
    );
  }

  /**
   * Render our title...if supplied.
   */
  renderTitle() {
    if (this.opts.title) {
      return (
        <View style={[styles.controls.control, styles.controls.title]}>
          <Text
            style={[styles.controls.text, styles.controls.titleText]}
            numberOfLines={1}>
            {this.opts.title || ''}
          </Text>
        </View>
      );
    }

    return null;
  }

  /**
   * Show our timer.
   */
  renderTimer() {
    return this.renderControl(
      <Text style={styles.controls.timerText}>{this.calculateTime()}</Text>,
      this.methods.toggleTimer,
      styles.controls.timer,
    );
  }

  /**
   * Show loading icon or thumbnail
   */
  renderLoader() {
    if (this.state.loading || !this.props.shouldPlay) {
      if (this.props.thumbnailUri) {
        return (
          <View style={styles.loader.container}>
            <TouchableWithoutFeedback onPress={this.events.onVideoPress}>
              <View>
                <FastImage
                  source={{
                    uri: this.props.thumbnailUri,
                    priority: FastImage.priority.normal,
                  }}
                  style={[this.styles.thumbnailStyle]}
                />
                {this.state.durationText && (
                  <Text style={styles.loader.duration}>
                    {this.state.durationText}
                  </Text>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        );
      }
      if (this.props.playLoaderAnimation) {
        return (
          <View style={styles.loader.container}>
            <Animated.Image
              source={require('./assets/img/loader-icon.png')}
              style={[
                styles.loader.icon,
                {
                  transform: [
                    {
                      rotate: this.animations.loader.rotate.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        );
      }
    }
    return null;
  }

  renderError() {
    if (this.state.error) {
      return (
        <View style={styles.error.container}>
          <Image
            source={require('./assets/img/error-icon.png')}
            style={styles.error.icon}
          />
          <Text style={styles.error.text}>Video unavailable</Text>
        </View>
      );
    }
    return null;
  }

  renderVideoScreenControls() {
    if (!this.props.disableVideoScreenControls) {
      return (
        <Animated.View
          style={[
            styles.controls.videoScreenControlsContainer,
            {
              opacity: this.animations.videoScreenControlsContainer.opacity,
              marginBottom: this.animations.videoScreenControlsContainer
                .marginBottom,
            },
          ]}>
          <View style={styles.controls.videoScreenControlsGroup}>
            {this.renderControl(
              <MaterialCommunityIcons
                name={this.props.isRTL ? 'skip-next' : 'skip-previous'}
                color={'#fff'}
                size={20}
              />,
              this.methods.restartVideo,
              styles.controls.videoScreenControl,
            )}
            {this.renderControl(
              <MaterialCommunityIcons
                name={'fast-forward'}
                color={'#fff'}
                size={20}
                style={
                  this.props.isRTL ? {} : {transform: [{rotateY: '180deg'}]}
                }
              />,
              this.methods.fastBackward,
              styles.controls.videoScreenControl,
            )}
            {this.renderControl(
              <MaterialCommunityIcons
                name={this.state.paused ? 'play' : 'pause'}
                color={'#fff'}
                size={20}
                style={
                  this.props.isRTL ? {transform: [{rotateY: '180deg'}]} : {}
                }
              />,
              this.methods.togglePlayPause,
              styles.controls.videoScreenControl,
            )}
            {this.renderControl(
              <MaterialCommunityIcons
                name={'fast-forward'}
                color={'#fff'}
                size={20}
                style={
                  this.props.isRTL ? {transform: [{rotateY: '180deg'}]} : {}
                }
              />,
              this.methods.fastForward,
              styles.controls.videoScreenControl,
            )}
            {this.renderControl(
              <MaterialCommunityIcons
                name={this.props.isRTL ? 'skip-previous' : 'skip-next'}
                color={'#fff'}
                size={20}
              />,
              this.methods.goToEnd,
              styles.controls.videoScreenControl,
            )}
          </View>
          <View style={styles.controls.videoScreenControlsGroup}>
            <View style={styles.controls.timerTextContainer}>
              <Text style={styles.controls.timerText}>
                {this.calculateTime()}
              </Text>
            </View>
            {this.renderSeekbar()}
            <View style={styles.controls.timerTextContainer}>
              <Text style={styles.controls.timerText}>
                {this.formatTime(this.state.duration)}
              </Text>
            </View>
            {this.renderControl(
              <MaterialCommunityIcons
                name={
                  this.state.isFullscreen ? 'fullscreen-exit' : 'fullscreen'
                }
                color={'#fff'}
                size={20}
              />,
              this.methods.toggleFullscreen,
              styles.controls.fullscreen,
            )}
          </View>
        </Animated.View>
      );
    }
    return null;
  }

  /**
   * Provide all of our options and render the whole component.
   */
  render() {
    return (
      <TouchableWithoutFeedback
        onPress={this.events.onScreenTouch}
        style={[styles.player.container, this.styles.containerStyle]}>
        <View style={[styles.player.container, this.styles.containerStyle]}>
          {this.props.shouldPlay && (
            <TouchableWithoutFeedback
              onPress={this.events.onVideoPress}
              style={[styles.player.container, this.styles.containerStyle]}>
              <Video
                {...this.props}
                ref={videoPlayer => (this.player.ref = videoPlayer)}
                resizeMode={this.state.resizeMode}
                volume={this.state.volume}
                paused={this.state.paused}
                muted={this.state.muted}
                rate={this.state.rate}
                onLoadStart={this.events.onLoadStart}
                onReadyForDisplay={this.events.onReadyForDisplay}
                onProgress={this.events.onProgress}
                onError={this.events.onError}
                onLoad={this.events.onLoad}
                onEnd={this.events.onEnd}
                onSeek={this.events.onSeek}
                style={[styles.player.video, this.styles.videoStyle]}
                source={this.props.source}
              />
            </TouchableWithoutFeedback>
          )}
          {this.renderError()}
          {this.renderLoader()}
          {this.renderTopControls()}
          {this.renderBottomControls()}
          {this.renderVideoScreenControls()}
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

/**
 * This object houses our styles. There's player
 * specific styles and control specific ones.
 * And then there's volume/seeker styles.
 */
const styles = {
  player: StyleSheet.create({
    container: {
      backgroundColor: '#000',
      flex: 1,
      alignSelf: 'stretch',
      justifyContent: 'space-between',
    },
    video: {
      overflow: 'hidden',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  }),
  error: StyleSheet.create({
    container: {
      backgroundColor: 'rgba( 0, 0, 0, 0.5 )',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: {
      marginBottom: 16,
    },
    text: {
      backgroundColor: 'transparent',
      color: '#f27474',
    },
  }),
  loader: StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    duration: {
      color: 'white',
      backgroundColor: 'black',
      opacity: 0.8,
      position: 'absolute',
      bottom: 10,
      right: 10,
      borderRadius: 5,
      paddingRight: 5,
      paddingLeft: 5,
      overflow: 'hidden',
    },
  }),
  controls: StyleSheet.create({
    row: {
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: null,
      width: null,
    },
    column: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: null,
      width: null,
    },
    vignette: {
      resizeMode: 'stretch',
    },
    control: {
      padding: 16,
    },
    text: {
      backgroundColor: 'transparent',
      color: '#FFF',
      fontSize: 14,
      textAlign: 'center',
    },
    pullRight: {
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    volume: {
      alignSelf: 'flex-end',
      marginTop: -5,
      position: 'absolute',
      padding: 0,
    },
    topControlGroup: {
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      width: null,
      margin: 12,
      marginBottom: 18,
    },
    bottomControlGroup: {
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginLeft: 12,
      marginRight: 12,
      marginBottom: 0,
    },
    fullscreen: {
      width: '10%',
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    playPause: {
      position: 'relative',
      width: 80,
      zIndex: 0,
    },
    videoScreenControlsContainer: {
      height: '35%',
      width: '100%',
      backgroundColor: '#0c0c0c',
      opacity: 0.8,
      flexDirection: 'column',
      marginBottom: 0,
      maxHeight: 100,
    },
    videoScreenControlsGroup: {
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      justifyContent: 'center',
      height: '50%',
    },
    videoScreenControl: {
      position: 'relative',
      zIndex: 0,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    title: {
      alignItems: 'center',
      flex: 0.6,
      flexDirection: 'column',
      padding: 0,
    },
    titleText: {
      textAlign: 'center',
    },
    timer: {
      width: 80,
    },
    timerText: {
      backgroundColor: 'transparent',
      color: '#FFF',
      fontSize: 11,
      textAlign: 'center',
      width: '100%',
    },
    timerTextContainer: {
      width: '12%',
      justifyContent: 'center',
      height: '100%',
      marginHorizontal: 5,
    },
  }),
  volume: StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      height: 1,
      marginLeft: 20,
      marginRight: 20,
      width: 150,
    },
    track: {
      backgroundColor: '#333',
      height: 1,
      marginLeft: 7,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    },
    fill: {
      backgroundColor: '#FFF',
      height: 1,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    },
    handle: {
      position: 'absolute',
      marginTop: -24,
      marginLeft: -24,
      padding: 16,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    },
    icon: {
      padding: 10,
      top: 5,
    },
    iconBackground: {
      width: 40,
      height: 40,
      position: 'absolute',
      top: 5,
      backgroundColor: '#0c0c0c',
      borderRadius: 20,
    },
  }),
  seekbar: StyleSheet.create({
    container: {
      alignSelf: 'stretch',
      height: 20,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    },
    track: {
      backgroundColor: 'white',
      height: 1,
      position: 'absolute',
      width: '100%',
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    },
    fill: {
      backgroundColor: 'white',
      height: 1,
      width: '100%',
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    },
    handle: {
      position: 'absolute',
      marginLeft: -7,
      height: 28,
      width: 28,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    },
    circle: {
      position: 'absolute',
      borderRadius: 12,
      top: 14,
      left: 7,
      height: 12,
      width: 12,
      zIndex: 10,
      elevation: 10,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    },
  }),
};
