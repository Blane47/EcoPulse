import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Phone cameras produce 3–5 MB photos: slow to upload on mobile data and heavy to store.
// Scale the long edge down and re-encode as JPEG (~200–300 KB at 1280px) before sending.
export async function shrinkPhoto(asset, maxSide = 1280) {
  const { uri, width = 0, height = 0 } = asset;
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > maxSide) {
    context.resize(width >= height ? { width: maxSide } : { height: maxSide });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return { uri: result.uri, dataUrl: `data:image/jpeg;base64,${result.base64}` };
}
