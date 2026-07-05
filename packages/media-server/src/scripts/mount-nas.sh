#!/bin/bash
# Usage: ./mount-nas.sh [mount|umount]
# This script mounts the Huawei Home Storage via SMB/CIFS
# Set these environment variables or edit below:
#   NAS_ADDRESS, NAS_SHARE, NAS_USER, NAS_PASS

NAS_ADDRESS="${NAS_ADDRESS:-192.168.1.100}"
NAS_SHARE="${NAS_SHARE:-video}"
NAS_USER="${NAS_USER:-admin}"
NAS_PASS="${NAS_PASS:-password}"
MOUNT_POINT="${NAS_MOUNT:-/mnt/nas/videos}"

if [ "$1" = "umount" ]; then
  echo "Unmounting $MOUNT_POINT..."
  sudo umount "$MOUNT_POINT"
  exit $?
fi

echo "Mounting //${NAS_ADDRESS}/${NAS_SHARE} to ${MOUNT_POINT}..."
sudo mkdir -p "$MOUNT_POINT"
sudo mount -t cifs "//${NAS_ADDRESS}/${NAS_SHARE}" "$MOUNT_POINT" \
  -o username="$NAS_USER",password="$NAS_PASS",vers=3.0,uid=$(id -u),gid=$(id -g),iocharset=utf8,file_mode=0644,dir_mode=0755

if [ $? -eq 0 ]; then
  echo "Mounted successfully at $MOUNT_POINT"
else
  echo "Mount failed"
  exit 1
fi
