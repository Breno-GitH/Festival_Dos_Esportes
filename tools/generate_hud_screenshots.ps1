Add-Type -AssemblyName System.Drawing

$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class HudScreenshotGenerator {
    public static void Generate(string basePath) {
        string outDir = Path.Combine(basePath, "medalhas");
        string artifactDir = @"C:\Users\Usuario\.gemini\antigravity\brain\a4f160de-9f45-46fc-8566-e303d1dcfdcf";

        string[] medalNames = new string[] {
            "ping_pong", "basquete", "corrida", "skate",
            "arco", "escalada", "boxe", "surf"
        };

        Bitmap[] lockedImgs = new Bitmap[8];
        Bitmap[] unlockedImgs = new Bitmap[8];

        for (int i = 0; i < 8; i++) {
            lockedImgs[i] = new Bitmap(Path.Combine(outDir, medalNames[i] + "_locked.png"));
            unlockedImgs[i] = new Bitmap(Path.Combine(outDir, medalNames[i] + "_unlocked.png"));
        }

        // Render function for a simulated 450x300 Overworld screen
        Action<string, bool[]> renderScene = (filename, unlockedMask) => {
            using (Bitmap canvas = new Bitmap(450, 300, PixelFormat.Format32bppArgb))
            using (Graphics g = Graphics.FromImage(canvas)) {
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;

                // 1. Water background
                using (Brush waterBrush = new SolidBrush(Color.FromArgb(255, 66, 165, 245))) {
                    g.FillRectangle(waterBrush, 0, 0, 450, 300);
                }

                // 2. Hub Island grass
                using (Brush grassBrush = new SolidBrush(Color.FromArgb(255, 76, 175, 80))) {
                    g.FillRectangle(grassBrush, 60, 40, 330, 220);
                }
                using (Brush pathBrush = new SolidBrush(Color.FromArgb(255, 141, 110, 99))) {
                    g.FillRectangle(pathBrush, 210, 40, 30, 220);
                    g.FillRectangle(pathBrush, 60, 135, 330, 30);
                }

                // 3. Central Plaza
                using (Brush plazaBrush = new SolidBrush(Color.FromArgb(255, 200, 230, 201))) {
                    g.FillEllipse(plazaBrush, 175, 100, 100, 100);
                }

                // 4. Title / Status text
                using (Font font = new Font("Monospace", 9, FontStyle.Bold))
                using (Brush textBrush = new SolidBrush(Color.White)) {
                    g.DrawString("FESTIVAL DOS ESPORTES - OVERWORLD", font, textBrush, 10, 10);
                }

                // 5. Draw Medal Shelf HUD in bottom left (same as drawMedalhasHUD)
                int boxX = 6;
                int boxY = 263;
                int boxW = 200;
                int boxH = 33;

                using (Brush hudBg = new SolidBrush(Color.FromArgb(215, 10, 14, 26))) {
                    g.FillRectangle(hudBg, boxX, boxY, boxW, boxH);
                }
                using (Pen hudBorder = new Pen(Color.FromArgb(100, 255, 215, 0), 1)) {
                    g.DrawRectangle(hudBorder, boxX, boxY, boxW - 1, boxH - 1);
                }

                int medalW = 20;
                int medalH = 23;
                int startX = 10;
                int startY = 268;
                int spacingX = 24;

                for (int i = 0; i < 8; i++) {
                    Bitmap img = unlockedMask[i] ? unlockedImgs[i] : lockedImgs[i];
                    g.DrawImage(img, startX + i * spacingX, startY, medalW, medalH);
                }

                string savePath = Path.Combine(outDir, filename);
                canvas.Save(savePath, ImageFormat.Png);
                Console.WriteLine("Salvo: " + savePath);

                if (Directory.Exists(artifactDir)) {
                    string artPath = Path.Combine(artifactDir, filename);
                    canvas.Save(artPath, ImageFormat.Png);
                    Console.WriteLine("Copiado para artifact: " + artPath);
                }
            }
        };

        // Screenshot 1: Zero medalhas (todas 8 bloqueadas)
        renderScene("screenshot_0_medalhas.png", new bool[] { false, false, false, false, false, false, false, false });

        // Screenshot 2: Algumas medalhas (Ping-Pong, Corrida, Skate desbloqueadas)
        renderScene("screenshot_3_medalhas.png", new bool[] { true, false, true, true, false, false, false, false });

        // Screenshot 3: Oito medalhas (todas 8 desbloqueadas)
        renderScene("screenshot_8_medalhas.png", new bool[] { true, true, true, true, true, true, true, true });

        for (int i = 0; i < 8; i++) {
            lockedImgs[i].Dispose();
            unlockedImgs[i].Dispose();
        }
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
[HudScreenshotGenerator]::Generate((Get-Location).Path)
