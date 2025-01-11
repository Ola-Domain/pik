import { useState, Suspense, lazy } from "react";

import "./profile-card.scss";
import FullscreenSpinner from "../../../common/components/fullscreen-spinner";
import { modifyScrollbar } from "../../../common/utils";
import constants from "../../../common/constants";
const LoadVideoModal = lazy(
	() => import("../../components/video-modal/LoadVideoModal")
);

export default function ProfileCard({ videoId }: { videoId: string }) {
	const [showModal, setShowModal] = useState(false);

	function handleModalOpen() {
		modifyScrollbar("hide");
		setShowModal(true);
	}

	return (
		<div className="profile-card">
			{showModal && (
				<Suspense fallback={<FullscreenSpinner />}>
					<LoadVideoModal videoId={videoId} setShowModal={setShowModal} />
				</Suspense>
			)}
			<div className="video-container">
				<video
					src={constants.videoLink + "/" + videoId + "#t=0.1"}
					playsInline
					muted
					loop
					onMouseOver={e => (e.target as HTMLVideoElement).play()}
					onMouseOut={e => (e.target as HTMLVideoElement).pause()}
					onClick={handleModalOpen}
				>
					Your browser does not support videos.
				</video>
			</div>
		</div>
	);
}
