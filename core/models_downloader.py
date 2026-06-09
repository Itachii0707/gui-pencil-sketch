import os
import urllib.request

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

MODELS = {
    "espcn_x4": {
        "url": "https://raw.githubusercontent.com/fannymonori/TF-ESPCN/master/export/ESPCN_x4.pb",
        "file": "ESPCN_x4.pb"
    },
    "style_mosaic": {
        "url": "https://cs.stanford.edu/people/jcjohns/fast-neural-style/models/eccv16/mosaic.t7",
        "file": "mosaic.t7"
    },
    "style_candy": {
        "url": "https://cs.stanford.edu/people/jcjohns/fast-neural-style/models/eccv16/candy.t7",
        "file": "candy.t7"
    },
    "style_starry_night": {
        "url": "https://cs.stanford.edu/people/jcjohns/fast-neural-style/models/eccv16/starry_night.t7",
        "file": "starry_night.t7"
    },
    "style_anime": {
        "url": "https://cs.stanford.edu/people/jcjohns/fast-neural-style/models/eccv16/la_muse.t7",
        "file": "la_muse.t7"
    },
    "style_3d": {
        "url": "https://cs.stanford.edu/people/jcjohns/fast-neural-style/models/eccv16/udnie.t7",
        "file": "udnie.t7"
    }
}

def ensure_model(model_key: str) -> str:
    """
    Downloads the requested model if it doesn't exist locally.
    Returns the absolute path to the model file.
    """
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)

    if model_key not in MODELS:
        raise ValueError(f"Unknown model key: {model_key}")

    model_info = MODELS[model_key]
    model_path = os.path.join(MODELS_DIR, model_info["file"])

    if not os.path.exists(model_path):
        print(f"Downloading model {model_key} from {model_info['url']}...")
        try:
            # Add a user-agent to bypass some basic bot blocks
            req = urllib.request.Request(model_info['url'], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response, open(model_path, 'wb') as out_file:
                data = response.read()
                out_file.write(data)
            print(f"Downloaded {model_info['file']} successfully.")
        except Exception as e:
            if os.path.exists(model_path):
                os.remove(model_path) # Clean up partial file
            raise RuntimeError(f"Failed to download model {model_key}: {e}")

    return model_path

if __name__ == "__main__":
    ensure_model("espcn_x4")
