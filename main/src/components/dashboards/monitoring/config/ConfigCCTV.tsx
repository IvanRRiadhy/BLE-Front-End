import VideoPlayer from "src/components/shared/VideoPlayer";




const ConfigCCTV = (rtsp: string) => {
    const videoJsOptions = {
  autoplay: true,
  controls: true,
  responsive: true,
  fluid: false, // pastikan false
  width: 2300,
  height: 2500,
  sources: [
    {
      src: rtsp,
      type: 'application/x-mpegURL',
    },
  ],
  html5: {
    hls: {
      overrideNative: true,
    },
  },
};
  return <VideoPlayer options={videoJsOptions} />;
};

export default ConfigCCTV;