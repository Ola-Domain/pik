import { useState, useRef, useEffect, useCallback, MouseEvent } from "react";

import classes from "./video-tag.module.scss";
import LoadingSpinner from "../../../common/components/loading-spinner";
import { ComponentProps } from "../../../common/types";
import { joinClasses, getTimeFromSeconds } from "../../../common/utils";

interface Props extends ComponentProps {
	src: string;
	autoPlay?: boolean;
	muted?: boolean;
	loop?: boolean;
	controls?: boolean;
	onClick?: (a?: MouseEvent) => void;
}

export default function VideoTag({
	src,
	autoPlay,
	className,
	muted,
	loop,
	controls,
	onClick
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const wasPlaying = useRef(false);
	const vidDuration = useRef("00:00");
	const [isMuted, setIsMuted] = useState(muted != null && muted);
	const [isPlaying, setIsPlaying] = useState(false);
	const [showSpinner, setShowSpinner] = useState(true);
	const [showControls, setShowControls] = useState(false);
	const [curTime, setCurTime] = useState(0);

	useEffect(() => {
		if (!videoRef.current) return;
		const vid = videoRef.current;

		function toggleSpinnerOn() {
			setShowSpinner(true);
		}
		function toggleSpinnerOff() {
			setShowSpinner(false);
		}
		function toggleIsPlayingOn() {
			setIsPlaying(true);
		}
		function toggleIsPlayingOff() {
			setIsPlaying(false);
		}
		function updateTime() {
			setCurTime(vid.currentTime);
		}
		function handleClick() {
			if (!vid.paused) vid.pause();
		}
		function setDuration() {
			vidDuration.current = getTimeFromSeconds(vid.duration);
		}

		vid.addEventListener("loadedmetadata", setDuration);
		vid.addEventListener("loadeddata", toggleSpinnerOff);
		vid.addEventListener("waiting", toggleSpinnerOn);
		vid.addEventListener("playing", toggleSpinnerOff);
		vid.addEventListener("play", toggleIsPlayingOn);
		vid.addEventListener("pause", toggleIsPlayingOff);
		vid.addEventListener("timeupdate", updateTime);
		vid.addEventListener("click", handleClick);

		return () => {
			vid.removeEventListener("loadedmetadata", setDuration);
			vid.removeEventListener("loadeddata", toggleSpinnerOff);
			vid.removeEventListener("waiting", toggleSpinnerOn);
			vid.removeEventListener("playing", toggleSpinnerOff);
			vid.removeEventListener("play", toggleIsPlayingOn);
			vid.removeEventListener("pause", toggleIsPlayingOff);
			vid.removeEventListener("timeupdate", updateTime);
			vid.removeEventListener("click", handleClick);
		};
	}, []);

	useEffect(() => {
		if (!controls || !containerRef.current) return;
		const container = containerRef.current;

		function toggleControlsOff() {
			setShowControls(false);
		}
		function toggleControlsOn() {
			setShowControls(true);
		}

		container.addEventListener("mouseenter", toggleControlsOn);
		container.addEventListener("mouseleave", toggleControlsOff);

		return () => {
			container.removeEventListener("mouseenter", toggleControlsOn);
			container.removeEventListener("mouseleave", toggleControlsOff);
		};
	}, [controls]);

	const handlePlayPause = useCallback((e: MouseEvent) => {
		if (!videoRef.current) return;
		if (videoRef.current.paused) videoRef.current.play();
		else videoRef.current.pause();

		e.stopPropagation();
		e.preventDefault();
	}, []);

	const changeTime = useCallback((duration: number) => {
		if (!videoRef.current) return;
		videoRef.current.currentTime = duration;
		setCurTime(duration);
	}, []);

	const handleSeek = useCallback(
		(e: MouseEvent) => {
			if (!videoRef.current) return;
			if (e.type === "mousedown") {
				wasPlaying.current = isPlaying;
				videoRef.current.pause();
			} else if (wasPlaying.current) videoRef.current.play();
		},
		[isPlaying]
	);

	const handleMute = useCallback(() => {
		if (!videoRef.current) return;
		videoRef.current.muted = !isMuted;
		setIsMuted(!isMuted);
	}, [isMuted]);

	return (
		<div
			className={joinClasses(classes["video-tag-container"], className)}
			ref={containerRef}
		>
			<video
				ref={videoRef}
				src={src}
				playsInline
				preload="metadata"
				disablePictureInPicture
				autoPlay={autoPlay}
				muted={muted}
				loop={loop}
				onClick={onClick}
			>
				Your browser does not support HTML videos.
			</video>
			{showSpinner && <LoadingSpinner className={classes["spinner"]} />}
			{controls && !showSpinner && showControls && (
				<div className={classes["controls"]}>
					<i
						className={joinClasses(
							"fas",
							isMuted ? "fa-volume-mute" : "fa-volume-up",
							classes["button"],
							classes["volume-btn"]
						)}
						onClick={handleMute}
					/>
					<i
						className={joinClasses(
							"fas",
							isPlaying ? "fa-pause" : "fa-play",
							classes["button"],
							classes["center-btn"]
						)}
						onClick={handlePlayPause}
					/>
					<div className={joinClasses(classes["button"], classes["seek-bar"])}>
						<input
							type="range"
							step={0.01}
							max={videoRef.current?.duration}
							min={0}
							value={curTime}
							onChange={e => changeTime(parseFloat(e.target.value))}
							onMouseDown={handleSeek}
							onMouseUp={handleSeek}
						/>
						<span>
							{getTimeFromSeconds(curTime)}&nbsp;/&nbsp;
							{vidDuration.current}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
