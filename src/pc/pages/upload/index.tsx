import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as yup from "yup";
import { Socket } from "socket.io-client";

import "./upload-page.scss";
import Container from "../../components/container";
import Input from "../../../common/components/input-field";
import LoadingSpinner from "../../../common/components/loading-spinner";
import { createVideo } from "../../../common/api/video";
import { useAppDispatch, useAppSelector } from "../../../common/store";
import { notificationActions } from "../../../common/store/slices/notification-slice";
import constants from "../../../common/constants";

const validationSchema = yup.object().shape({
	caption: yup
		.string()
		.required("Required")
		.max(
			constants.captionMaxLen,
			`At most ${constants.captionMaxLen} characters`
		),
	music: yup
		.string()
		.max(constants.musicMaxLen, `At most ${constants.musicMaxLen} characters`),
	tags: yup
		.string()
		.required("Required")
		.max(constants.tagsMaxLen, `At most ${constants.tagsMaxLen} characters`)
});

export default function UploadPage() {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const socketRef = useRef<Socket | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [videoFile, setVideoFile] = useState<File>();
	const [uploadProgress, setUploadProgress] = useState(0);
	const [compressionProgress, setCompressionProgress] = useState({
		percent: 0,
		eta: ""
	});
	const [showProgressBox, setShowProgressBox] = useState(false);
	const { username, token } = useAppSelector(state => state.auth);
	const videoURL = useMemo(
		() => (videoFile ? URL.createObjectURL(videoFile) : undefined),
		[videoFile]
	);

	const progressFn = useCallback(
		(type: "upload" | "compress", progress: any) => {
			if (type === "upload") setUploadProgress(progress);
			else setCompressionProgress(progress);
		},
		[]
	);

	const cancelFn = useCallback(() => {
		if (socketRef.current) {
			socketRef.current.emit("cancelCompression");
			socketRef.current.disconnect();
			socketRef.current = null;
		}
		setShowProgressBox(false);
		setIsLoading(false);
		setUploadProgress(0);
		setCompressionProgress({ percent: 0, eta: "" });
	}, []);

	const completeFn = useCallback(
		(videoId: string) => {
			navigate("/video/" + videoId);
		},
		[navigate]
	);

	const errFn = useCallback(
		(err: Error) => {
			dispatch(
				notificationActions.showNotification({
					type: "error",
					message: "Compression error: " + err.message
				})
			);
			cancelFn();
		},
		[dispatch, cancelFn]
	);

	const formik = useFormik({
		initialValues: {
			caption: "",
			music: "",
			tags: ""
		},
		validationSchema,
		onSubmit: async values => {
			setIsLoading(true);
			try {
				if (!videoFile || videoFile.type !== "video/mp4")
					throw new Error("Invalid video");
				if (videoFile.size > constants.videoSizeLimit)
					throw new Error("File too large");

				const formData = new FormData();
				formData.append("caption", values.caption);
				formData.append("tags", values.tags);
				formData.append("music", values.music);
				formData.append("username", username!);
				formData.append("token", token!);
				// keep the file last or the server does not get the correct data
				formData.append("video", videoFile);

				setShowProgressBox(true);
				socketRef.current = await createVideo(
					formData,
					{
						...values,
						username: username!
					},
					progressFn,
					completeFn,
					errFn
				);
			} catch (err: any) {
				setIsLoading(false);
				dispatch(
					notificationActions.showNotification({
						type: "error",
						message: err.message
					})
				);
			}
		}
	});

	return (
		<Container className="upload-page-container">
			{showProgressBox && (
				<>
					<div className="backdrop box-backdrop" />
					<div className="progress-box">
						<h3>Progress</h3>
						<h5>
							Uploaded: <p>{uploadProgress}%</p>
						</h5>
						<h5>
							Compressed: <p>{compressionProgress.percent}%</p>
							{compressionProgress.eta && (
								<span>{compressionProgress.eta} left</span>
							)}
						</h5>
						<button
							className="secondary-button"
							onClick={cancelFn}
							disabled={!socketRef.current}
						>
							Cancel
						</button>
					</div>
				</>
			)}
			<div className="card">
				<header>
					<h1>Upload video</h1>
					<h4>Post a video to your account</h4>
				</header>
				<div className="card-body">
					<label htmlFor="video">
						<div className="video-portion">
							{videoFile?.type === "video/mp4" ? (
								<video src={videoURL} autoPlay muted>
									Your browser does not support videos.
								</video>
							) : (
								<>
									<i className="fas fa-video" />
									<h4>Select video to upload</h4>
									<p>
										<span>MP4 format</span>
										<span>9 / 16 aspect ratio (preferred)</span>
										<span>
											Less than {constants.videoSizeLimit / 1048576} MB
										</span>
									</p>
								</>
							)}
							<input
								type="file"
								accept="video/mp4"
								id="video"
								onChange={e => setVideoFile(e.target.files?.[0])}
							/>
						</div>
					</label>
					<form className="description-portion" onSubmit={formik.handleSubmit}>
						<div className="form-group">
							<h5>
								<label htmlFor="caption">Caption</label>
								<span>
									Currently does not support @ mentions (and won't till I figure
									out how mentions work 🙂).
								</span>
							</h5>
							<Input
								id="caption"
								className="input"
								name="caption"
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								error={formik.touched.caption && formik.errors.caption}
								autoComplete="off"
							/>
						</div>
						<div className="form-group">
							<h5>
								<label htmlFor="tags">Tags</label>
								<span>
									Space separated list of words (# can be omitted). Used while
									searching for videos and (eventually) for recommendations.
									<br />
									Example: "#Tag1 Tag2"
								</span>
							</h5>
							<Input
								id="tags"
								className="input"
								name="tags"
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								error={formik.touched.tags && formik.errors.tags}
								autoComplete="off"
							/>
						</div>
						<div
							className="form-group"
							title="Music used in the video, if any. (Please don't copy strike me)"
						>
							<h5>
								<label htmlFor="music">Music</label>
								<span>
									TikTok (the real one) identifies music used in the video
									automatically, but no such feature exists here so you gotta
									type it manually 😊. Can also be left blank. <br /> Example:
									Rick Astley - Never gonna give you up
								</span>
							</h5>
							<Input
								id="music"
								className="input"
								name="music"
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								error={formik.touched.music && formik.errors.music}
								autoComplete="off"
							/>
						</div>
						<button
							type="submit"
							className="primary-button"
							disabled={
								!formik.dirty || !formik.isValid || !videoFile || isLoading
							}
						>
							{isLoading ? (
								<LoadingSpinner className="upload-spinner" />
							) : (
								"Post"
							)}
						</button>
					</form>
				</div>
			</div>
		</Container>
	);
}
