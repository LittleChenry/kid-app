#!/bin/bash
# NAS挂载脚本 - 直接挂载KIDAPP目录
# 用法: ./mount-nas.sh

MOUNT_POINT="/mnt/huawei-nas"

echo "=== 挂载华为家庭存储 KIDAPP ==="
echo "地址: //192.168.0.100/家庭共享/video/KIDAPP"
echo "挂载点: $MOUNT_POINT"

# 卸载旧的挂载（如果存在）
if mount | grep -q "$MOUNT_POINT"; then
    echo "卸载旧的挂载..."
    sudo umount "$MOUNT_POINT"
fi

# 创建挂载点（如果不存在）
sudo mkdir -p "$MOUNT_POINT"

# 挂载NAS - 直接挂到KIDAPP目录
echo "正在挂载..."
sudo mount -t cifs //192.168.0.100/家庭共享/video/KIDAPP "$MOUNT_POINT" \
    -o credentials=/home/chenry/.smbcredentials,iocharset=utf8,uid=1000,gid=1000,file_mode=0644,dir_mode=0755,nofail,vers=3.0

if [ $? -eq 0 ]; then
    echo "✓ 挂载成功！"
    echo ""
    echo "=== KIDAPP 内容 ==="
    ls -la "$MOUNT_POINT"
    echo ""
    echo "=== 视频文件数量 ==="
    find "$MOUNT_POINT" -type f \( -name "*.mp4" -o -name "*.mkv" \) | wc -l
else
    echo "✗ 挂载失败"
    echo "错误信息: $?"
    exit 1
fi
