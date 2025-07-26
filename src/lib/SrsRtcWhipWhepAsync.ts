interface PublishOptions {
    app: string;
    stream: string;
    audio?: boolean;
    camera?: boolean;
    screen?: boolean;
}

interface PlayOptions {
    app: string;
    stream: string;
    audio?: boolean;
    video?: boolean;
}

interface ResourceResponse {
    sessionid: string;
    simulator: string;
}

export function SrsRtcWhipWhepAsync() {
    interface SrsRtcSelf {
        constraints: MediaStreamConstraints;
        publishWithStream: (options: PublishOptions, mediaStream: MediaStream) => Promise<ResourceResponse>;
        publish: (options: PublishOptions) => Promise<ResourceResponse>;
        play: (options: PlayOptions) => Promise<ResourceResponse>;
        close: () => void;
        ontrack?: (event: MediaStreamTrackEvent) => void;
        pc: RTCPeerConnection;
        stream: MediaStream;
        url: string;
        __internal: {
            parseId: (
                url: string,
                offer: string,
                answer: string
            ) => ResourceResponse;
        };
    }

    const self: SrsRtcSelf = {
        constraints: {
            audio: true,
            video: {
                width: { ideal: 720, max: 1024 },
            },
        },
        // 添加自定义流
        publishWithStream: async function(options, mediaStream) {
            if (!window.RTCPeerConnection || !navigator.mediaDevices) {
                throw new Error('WebRTC is not supported in this environment');
            }

            // 设置选项
            const useAudio = options?.audio ?? true;
            const useVideo = options?.camera ?? true;

            // 清除之前的流
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = new MediaStream();
            }

            try {
                // 添加音视频轨道
                if (useAudio && mediaStream.getAudioTracks().length > 0) {
                    this.pc.addTransceiver("audio", { direction: "sendonly" });
                    mediaStream.getAudioTracks().forEach(track => {
                        this.pc.addTrack(track);
                        this.ontrack && this.ontrack(new MediaStreamTrackEvent('track', { track }));
                    });
                }

                if (useVideo && mediaStream.getVideoTracks().length > 0) {
                    this.pc.addTransceiver("video", { direction: "sendonly" });
                    mediaStream.getVideoTracks().forEach(track => {
                        this.pc.addTrack(track);
                        this.ontrack && this.ontrack(new MediaStreamTrackEvent('track', { track }));
                    });
                }

                // 创建并发送SDP
                const offer = await this.pc.createOffer();
                await this.pc.setLocalDescription(offer);
                const answer = await new Promise<string>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open(
                        'POST',
                        `${this.url}whip/?app=${options.app}&stream=${options.stream}`,
                        true
                    );
                    xhr.setRequestHeader('Content-type', 'application/sdp');
                    xhr.setRequestHeader('Authorization', sessionStorage.getItem("accessToken") || '');
                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(xhr.responseText);
                        } else {
                            reject(new Error(`SRS request failed: ${xhr.status} ${xhr.statusText}`));
                        }
                    };
                    xhr.onerror = () => reject(new Error('Network error'));
                    xhr.send(offer.sdp);
                });
                await this.pc.setRemoteDescription(
                    new RTCSessionDescription({ type: 'answer', sdp: answer })
                );
                return this.__internal.parseId(this.url, offer.sdp!, answer);
                // return {
                //     sessionId: offer.sdp?.slice(0, 40) + '...' || '',
                //     url: this.url
                // };
            } catch (error) {
                this.close();
                throw error;
            }
        },
        publish: async function (options: PublishOptions) {
            if (!window.RTCPeerConnection || !navigator.mediaDevices) {
                throw new Error('WebRTC is not supported in this environment');
            }

            const hasAudio = options?.audio ?? true;
            const useCamera = options?.camera ?? true;
            const useScreen = options?.screen ?? false;

            if (!hasAudio && !useCamera && !useScreen) {
                this.close();
                throw new Error(
                    "Cannot publish: audio, camera, and screen all disabled"
                );
            }

            if (hasAudio) {
                this.pc.addTransceiver("audio", { direction: "sendonly" });
            } else {
                this.constraints.audio = false;
            }

            if (useCamera || useScreen) {
                this.pc.addTransceiver("video", { direction: "sendonly" });
            }

            if (!useCamera) {
                this.constraints.video = false;
            }

            try {
                if (useScreen) {
                    const displayStream = await navigator.mediaDevices.getDisplayMedia({
                        video: true,
                    });
                    displayStream.getTracks().forEach((track) => {
                        this.pc.addTrack(track);
                        this.ontrack?.(new MediaStreamTrackEvent('track', { track }));
                    });
                }

                if (useCamera || hasAudio) {
                    const userStream = await navigator.mediaDevices.getUserMedia(
                        this.constraints
                    );
                    userStream.getTracks().forEach((track) => {
                        this.pc.addTrack(track);
                        this.ontrack?.(new MediaStreamTrackEvent('track', { track }));
                    });
                }

                const offer = await this.pc.createOffer();
                await this.pc.setLocalDescription(offer);
                const answer = await new Promise<string>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open(
                        'POST',
                        `${this.url}whip/?app=${options.app}&stream=${options.stream}`,
                        true
                    );
                    xhr.setRequestHeader('Content-type', 'application/sdp');
                    xhr.setRequestHeader('Authorization', sessionStorage.getItem("accessToken") || '');
                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(xhr.responseText);
                        } else {
                            reject(new Error(`SRS request failed: ${xhr.status} ${xhr.statusText}`));
                        }
                    };
                    xhr.onerror = () => reject(new Error('Network error'));
                    xhr.send(offer.sdp);
                });
                await this.pc.setRemoteDescription(
                    new RTCSessionDescription({ type: 'answer', sdp: answer })
                );
                return this.__internal.parseId(this.url, offer.sdp!, answer);
            } catch (error) {
                this.close();
                throw error;
            }
        },
        play: async function (options: PlayOptions) {
            if (!options?.audio && !options?.video) {
                throw new Error(
                    "Must enable at least one of audio or video for playback"
                );
            }

            if (options.audio) {
                this.pc.addTransceiver("audio", { direction: "recvonly" });
            }
            if (options.video) {
                this.pc.addTransceiver("video", { direction: "recvonly" });
            }

            try {
                const offer = await this.pc.createOffer();
                await this.pc.setLocalDescription(offer);
                const answer = await new Promise<string>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open(
                        'POST',
                        `${this.url}whep/?app=${options.app}&stream=${options.stream}`,
                        true
                    );
                    xhr.setRequestHeader('Content-type', 'application/sdp');
                    xhr.setRequestHeader('Authorization', sessionStorage.getItem("accessToken") || '');
                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(xhr.responseText);
                        } else {
                            reject(new Error(`SRS playback failed: ${xhr.status}`));
                        }
                    };
                    xhr.onerror = () => reject(new Error('Network error'));
                    xhr.send(offer.sdp!);
                });
                await this.pc.setRemoteDescription(
                    new RTCSessionDescription({ type: 'answer', sdp: answer })
                );
                return this.__internal.parseId(this.url, offer.sdp!, answer);
            } catch (error) {
                this.close();
                throw error;
            }
        },
        close: function () {
            this.pc?.close();
            this.pc = new RTCPeerConnection(undefined);
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = new MediaStream();
        },
        ontrack: undefined,
        pc: new RTCPeerConnection(undefined),
        stream: new MediaStream(),
        url: "http://192.168.58.129:1985/rtc/v1/",
        __internal: {
            parseId: (url: string, offer: string, answer: string) => {
                const getUfrag = (sdp: string) => {
                    const match = sdp.match(/a=ice-ufrag:(\S+)/);
                    return match ? match[1] : '';
                };
                const sessionid = `${getUfrag(offer)}:${getUfrag(answer)}`;
                const urlObj = new URL(url);
                return {
                    sessionid,
                    simulator: `${urlObj.protocol}//${urlObj.host}/rtc/v1/nack/`,
                };
            },
        },
    };

    self.pc.ontrack = (event: RTCTrackEvent) => {
        if (self.ontrack) {
            self.ontrack(new MediaStreamTrackEvent('track', { track: event.track }));
        }
        self.stream.addTrack(event.track);
    };

    return self;
}
