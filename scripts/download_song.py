import yt_dlp
import sys
import os
import shutil

def download_song(url, public_dir):
    songs_dir = os.path.join(public_dir, "songs")
    thumbs_dir = os.path.join(public_dir, "thumbs")
    
    if not os.path.exists(songs_dir):
        os.makedirs(songs_dir)
    if not os.path.exists(thumbs_dir):
        os.makedirs(thumbs_dir)
        
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'm4a',
            'preferredquality': '192',
        }],
        'outtmpl': os.path.join(songs_dir, '%(id)s.%(ext)s'),
        'writethumbnail': True,
        'quiet': False,
        'noplaylist': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        video_id = info['id']
        
        # Locate the downloaded thumbnail
        # yt-dlp might save it as .webp, .jpg, etc.
        for ext in ['webp', 'jpg', 'png', 'jpeg']:
            thumb_path = os.path.join(songs_dir, f"{video_id}.{ext}")
            if os.path.exists(thumb_path):
                dest_path = os.path.join(thumbs_dir, f"{video_id}.{ext}")
                shutil.move(thumb_path, dest_path)
                print(f"Moved thumbnail to: {dest_path}")
                break
                
        return info

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python download_song.py <url>")
        sys.exit(1)
        
    url = sys.argv[1]
    public_dir = "C:/77/frontend/public"
    
    try:
        info = download_song(url, public_dir)
        print(f"SUCCESS: {info['title']} - {info['id']}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)
