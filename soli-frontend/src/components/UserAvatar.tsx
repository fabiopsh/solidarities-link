import { useState, useEffect } from "react";
import { Avatar } from "@mui/material";
import type { AvatarProps } from "@mui/material";
import api, { IMAGE_CACHE_TTL } from "../api";

interface UserAvatarProps extends AvatarProps {
  userId?: string;
  firstName?: string;
  lastName?: string;
}

export default function UserAvatar({ userId, firstName, lastName, ...props }: UserAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let urlToRevoke: string | null = null;

    if (userId) {
      api.get(`/api/users/${userId}/profile-picture`, { 
          responseType: "blob",
          cache: { ttl: IMAGE_CACHE_TTL }
      })
        .then((res) => {
          if (isMounted && res.status === 200 && res.data && res.data.size > 0) {
            urlToRevoke = URL.createObjectURL(res.data);
            setAvatarUrl(urlToRevoke);
          }
        })
        .catch(() => {});
    }
    return () => { 
        isMounted = false; 
        if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [userId]);

  const initials = `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "U";

  return (
    <Avatar src={avatarUrl || undefined} {...props}>
      {!avatarUrl ? initials : null}
    </Avatar>
  );
}
