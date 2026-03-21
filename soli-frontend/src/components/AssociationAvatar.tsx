import { useState, useEffect } from "react";
import { Box, Avatar } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import api from "../api";
import { IMAGE_CACHE_TTL } from "../api";

interface AssociationAvatarProps {
	associationId: string;
	accentColor?: string;
	size?: number;
}

export default function AssociationAvatar({ associationId, accentColor, size = 40 }: AssociationAvatarProps) {
	const [imageUrl, setImageUrl] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		let urlToRevoke: string | null = null;
		api
			.get(`/api/associations/${associationId}/image`, {
				responseType: "blob",
				cache: { ttl: IMAGE_CACHE_TTL },
			})
			.then((res) => {
				if (isMounted && res.status === 200 && res.data && res.data.size > 0) {
					urlToRevoke = URL.createObjectURL(res.data);
					setImageUrl(urlToRevoke);
				}
			})
			.catch(() => {
				// No image, use fallback
			});
		return () => {
			isMounted = false;
			if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
		};
	}, [associationId]);

	const bg = accentColor ?? "#00796B";
	const iconSize = Math.round(size * 0.45);

	if (imageUrl) {
		return (
			<Avatar
				src={imageUrl}
				sx={{ width: size, height: size, borderRadius: Math.round(size * 0.2) + "px" }}
			/>
		);
	}

	return (
		<Box
			sx={{
				width: size,
				height: size,
				borderRadius: Math.round(size * 0.2) + "px",
				bgcolor: bg,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
			}}
		>
			<GroupsIcon sx={{ fontSize: iconSize, color: "white" }} />
		</Box>
	);
}
