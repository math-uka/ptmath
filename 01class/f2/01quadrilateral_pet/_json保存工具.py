import json
import os
import sys
import tkinter as tk
from tkinter import messagebox, simpledialog
import requests

script_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
os.chdir(script_dir)

def get_clipboard():
    root = tk.Tk()
    root.withdraw()
    root.update()
    try:
        content = root.clipboard_get()
    except:
        content = ""
    root.destroy()
    return content.strip()

def get_available_folders(base_path="."):
    folders = []
    try:
        all_items = os.listdir(base_path)
        for item in sorted(all_items):
            item_path = os.path.join(base_path, item)
            if os.path.isdir(item_path) and item != "images" and not item.startswith('.'):
                folders.append(item)
    except:
        pass
    return folders

def ask_folder_selection(folders, title="選擇儲存位置"):
    if not folders:
        return None
   
    options = "0 = 儲存在同層目錄（目前位置）\n"
    for i, folder in enumerate(folders, 1):
        options += f"{i} = 儲存在 {folder}/ 目錄內\n"
   
    root = tk.Tk()
    root.withdraw()
    choice = simpledialog.askstring(
        title,
        f"發現以下資料夾：\n\n{options}\n請輸入數字選擇儲存位置：",
        parent=root
    )
    root.destroy()
   
    if choice is None:
        return None
   
    choice = choice.strip()
   
    if choice == "0":
        return None
   
    if choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(folders):
            return folders[idx]
   
    return None

def get_next_filename(base_name, target_folder=None, extension=".json"):
    """
    產生下一個檔名（原本用於 JSON 的遞增）
    但 py 下載部分會直接使用 base_name + extension，不遞增，直接覆蓋
    """
    def get_path(filename):
        if target_folder:
            return os.path.join(target_folder, filename)
        return filename

    candidate = f"{base_name}{extension}"
    if not os.path.exists(get_path(candidate)):
        return candidate
   
    i = 2
    while True:
        candidate = f"{base_name}{i}{extension}"
        if not os.path.exists(get_path(candidate)):
            return candidate
        i += 1

def get_next_series_json(mode):
    """
    mode 5 → 01.json ~ 99.json
    mode 6 → 001.json ~ 999.json
    """
    if mode == "5":
        fmt = "{:02d}"
        max_num = 99
    elif mode == "6":
        fmt = "{:03d}"
        max_num = 999
    else:
        raise ValueError("只支援 mode 5 或 6")

    num = 1
    while num <= max_num:
        filename = fmt.format(num) + ".json"
        if not os.path.exists(filename):
            return filename, num
        num += 1
    
    raise Exception(f"已達 {max_num} 個檔案上限")

def get_next_series_folder():
    num = 1
    while num <= 99:
        folder = f"{num:02d}"
        if not os.path.exists(folder):
            return folder
        num += 1
    raise Exception("已達 99 個系列資料夾上限")

def get_next_simple_folder():
    base = "simple"
    if not os.path.exists(base):
        return base, 0
    i = 2
    while True:
        folder = f"{base}{i}"
        if not os.path.exists(folder):
            return folder, i
        i += 1

def get_next_named_file_in_folder(folder, letter):
    os.makedirs(folder, exist_ok=True)
    i = 1
    while True:
        candidate = os.path.join(folder, f"{letter} ({i}).html")
        if not os.path.exists(candidate):
            return candidate, i
        i += 1

def get_next_tools_filename():
    base = "tools"
    ext = ".html"
    candidate = f"{base}{ext}"
    if not os.path.exists(candidate):
        return candidate, 0
    i = 2
    while True:
        candidate = f"{base}{i}{ext}"
        if not os.path.exists(candidate):
            return candidate, i
        i += 1

def download_webpage_content(url):
    try:
        response = requests.get(url, timeout=10)
        response.encoding = 'utf-8'
        if response.status_code == 200:
            return response.text
        else:
            error_msg = f"無法下載網頁（HTTP {response.status_code}）"
            print(error_msg)
            return f"<!-- {error_msg} -->\n<!-- 網址：{url} -->"
    except Exception as e:
        error_msg = f"下載失敗：{str(e)}"
        print(error_msg)
        return f"<!-- {error_msg} -->\n<!-- 網址：{url} -->"

# ====================== 主程式 ======================
content = get_clipboard()

# 即使剪貼簿是空的，也允許繼續執行（尤其是 0、5、6 模式）

root = tk.Tk()
root.withdraw()
choice = simpledialog.askstring(
    "儲存類型",
    "請輸入要儲存的類型：\n\n"
    "1 = hw.json 填空題\n"
    "2 = num.json 選擇題\n"
    "3 = help.json 幫助說明\n"
    "4 = rule.json 介紹\n"
    "5 = 01.json 課文內容（遞增 01~99）\n"
    "6 = 001.json 生字內容（遞增 001~999）\n"
    "7 = tools.html 網頁課件\n"
    "8 = test.py (直接覆蓋)\n"
    "9 = text.txt (直接覆蓋)\n"
    "0 = 特別系列 (數字資料夾 / tools / simple / 下載 py 工具)\n\n"
    "其他 = 自訂檔名（可直接含副檔名，例如：notes.md）\n\n"
    "輸入：",
    parent=root
)
root.destroy()

if choice is None:
    exit()

choice = choice.strip()
final_content = content
filename = None
target_folder = None

if choice == "0":
    root = tk.Tk()
    root.withdraw()
    series_choice = simpledialog.askstring(
        "選擇系列",
        "請選擇系列：\n\n"
        "1 = 數字系列（在 01/ 02/ ... 資料夾內建立 01.html）\n"
        "2 = tools系列（tools.html / tools2.html / tools3.html ...）\n"
        "3 = simple系列（在 simple/ simple2/ ... 資料夾內建立 字母 (數字).html）\n"
        "4 = 下載 py 工具程式（存成固定描述檔名，會覆蓋同名檔案）\n\n"
        "輸入 1、2、3 或 4：",
        parent=root
    )
    root.destroy()
    if series_choice is None:
        exit()
    series_choice = series_choice.strip()

    if series_choice not in ("1", "2", "3", "4"):
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("錯誤", "請輸入 1、2、3 或 4")
        root.destroy()
        exit()

    if series_choice == "4":
        root = tk.Tk()
        root.withdraw()
        py_num_str = simpledialog.askstring(
            "下載 Python 工具程式",
            "請輸入要下載的編號（1～9）：\n\n"
            "1 → _01資料夾圖片轉PPT.py\n"
            "2 → _密碼生成工具.py\n"
            "3 → _最終FILE.py\n"
            "4 → _課本文字記錄.py\n"
            "5 → _簡易練習網頁設定.py\n"
            "6~9 → 暫用 工具06.py ~ 工具09.py（可後續自訂名稱）\n\n"
            "將儲存到目前目錄，若同名檔案存在將直接覆蓋\n\n"
            "輸入數字：",
            parent=root
        )
        root.destroy()
        if py_num_str is None:
            exit()
        try:
            n = int(py_num_str.strip())
            if not 1 <= n <= 9:
                raise ValueError
        except:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("錯誤", "請輸入 1～9 的數字")
            root.destroy()
            exit()

        url = f"https://nokin.vercel.app/web_py/{n:02d}.py"
        # 固定描述性檔名（不遞增，直接覆蓋）
        descriptive_names = {
            1: "_01資料夾圖片轉PPT.py",
            2: "_密碼生成工具.py",
            3: "_最終FILE.py",
            4: "_課本文字記錄.py",
            5: "_簡易練習網頁設定.py",
        }
        filename = descriptive_names.get(n, f"工具{n:02d}.py")
        py_content = download_webpage_content(url)

        try:
            with open(filename, "w", encoding="utf-8", newline="\n") as f:
                f.write(py_content)
           
            root = tk.Tk()
            root.withdraw()
            messagebox.showinfo("儲存成功",
                f"工具程式已儲存（已覆蓋同名舊檔）：\n"
                f"檔名：{filename}\n"
                f"來源：{url}")
            root.destroy()
        except Exception as e:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("儲存失敗", f"無法儲存 {filename}\n\n錯誤：{str(e)}")
            root.destroy()
       
        exit()

    # 以下為原有 1,2,3 邏輯（維持原樣）
    if series_choice == "1":
        root = tk.Tk()
        root.withdraw()
        num_choice = simpledialog.askstring(
            "數字系列選項",
            "請選擇：\n\n"
            "0 或 Enter = 直接存剪貼簿內容\n"
            "1 練習工具\n"
            "2 課堂工具\n"
            "3 評測工具\n"
            "輸入：",
            parent=root
        )
        root.destroy()
        if num_choice is None or num_choice.strip() == "":
            num_choice = "0"
        num_choice = num_choice.strip()

        folder = get_next_series_folder()
        os.makedirs(folder, exist_ok=True)
       
        if num_choice in ("1","2","3"):
            num = int(num_choice)
            target_url = f"https://nokin.vercel.app/web_py/{num:02d}.html"
            final_content = download_webpage_content(target_url)
        else:
            final_content = content

        filename = os.path.join(folder, "01.html")

    elif series_choice == "2":
        root = tk.Tk()
        root.withdraw()
        tool_choice = simpledialog.askstring(
            "tools 頁面選項",
            "請選擇：\n\n"
            "0 或 Enter = 直接存剪貼簿內容\n"
            "1 練習工具\n"
            "2 課堂工具\n"
            "3 評測工具\n"
            "輸入：",
            parent=root
        )
        root.destroy()
        if tool_choice is None or tool_choice.strip() == "":
            tool_choice = "0"
        tool_choice = tool_choice.strip()

        if tool_choice in ("1","2","3"):
            num = int(tool_choice)
            target_url = f"https://nokin.vercel.app/web_py/{num:02d}.html"
            final_content = download_webpage_content(target_url)
        else:
            final_content = content

        filename, _ = get_next_tools_filename()

    else: # series_choice == "3"
        root = tk.Tk()
        root.withdraw()
        simple_choice = simpledialog.askstring(
            "simple 系列選項",
            "請選擇要使用的 simple 資料夾：\n\n"
            "0 或 Enter = 自動產生新的 simple 系列資料夾\n"
            "1 = 使用 simple 資料夾\n"
            "2 = 使用 simple2 資料夾\n"
            "3 = 使用 simple3 資料夾\n"
            "...\n"
            "9 = 使用 simple9 資料夾\n\n"
            "輸入數字：",
            parent=root
        )
        root.destroy()
        if simple_choice is None or simple_choice.strip() == "":
            simple_choice = "0"
        simple_choice = simple_choice.strip()

        if simple_choice == "0":
            folder, _ = get_next_simple_folder()
        elif simple_choice.isdigit() and 1 <= int(simple_choice) <= 9:
            num = int(simple_choice)
            folder = "simple" if num == 1 else f"simple{num}"
        else:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("錯誤", "請輸入 0-9 之間的數字")
            root.destroy()
            exit()

        root = tk.Tk()
        root.withdraw()
        letter_choice = simpledialog.askstring(
            "選擇字母",
            "請輸入字母（例如 a、b、c 等）：",
            parent=root
        )
        root.destroy()
        if letter_choice is None or letter_choice.strip() == "":
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("錯誤", "請輸入字母")
            root.destroy()
            exit()
       
        letter = letter_choice.strip().lower()
        if not letter.isalpha() or len(letter) != 1:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("錯誤", "請輸入單一字母（a-z）")
            root.destroy()
            exit()

        root = tk.Tk()
        root.withdraw()
        content_choice = simpledialog.askstring(
            "內容類型",
            "請選擇：\n\n"
            "0 或 Enter = 直接存剪貼簿內容\n"
            "1 練習工具\n"
            "2 課堂工具\n"
            "3 評測工具\n"
            "輸入：",
            parent=root
        )
        root.destroy()
        if content_choice is None or content_choice.strip() == "":
            content_choice = "0"
        content_choice = content_choice.strip()

        filename, _ = get_next_named_file_in_folder(folder, letter)

        if content_choice in ("1", "2", "3"):
            num = int(content_choice)
            target_url = f"https://nokin.vercel.app/web_py/{num:02d}.html"
            final_content = download_webpage_content(target_url)
        else:
            final_content = content

elif choice in ("5", "6"):
    # 新增模式5、6 的處理 — 即使剪貼簿空也可以執行
    try:
        filename, num = get_next_series_json(choice)
        # 若剪貼簿有內容就用，沒有就存空字串（或可改成其他預設內容）
        final_content = content if content else ""
    except Exception as e:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("錯誤", str(e))
        root.destroy()
        exit()

else:
    # 原有 JSON / 自訂 / 7,8,9 邏輯（維持原樣）
    if '.' in choice and choice not in ("7", "8", "9"):
        filename = choice
        if filename.lower().endswith('.json'):
            if content:
                try:
                    json.loads(content)
                except json.JSONDecodeError:
                    root = tk.Tk()
                    root.withdraw()
                    messagebox.showerror("錯誤", f"內容不是合法 JSON，但檔名是 .json：\n{filename}")
                    root.destroy()
                    exit()
            # 允許空內容存 .json
        final_content = content
    else:
        if choice == "7":
            filename, _ = get_next_tools_filename()
            final_content = content
        elif choice == "8":
            filename = "test.py"
            final_content = content
        elif choice == "9":
            filename = "text.txt"
            final_content = content
        else:
            if content:
                try:
                    json.loads(content)
                except json.JSONDecodeError:
                    root = tk.Tk()
                    root.withdraw()
                    messagebox.showerror("錯誤", "剪貼簿內容不是合法的 JSON！\n若要存非 JSON 請用 7、8、9 或 0 或自訂檔名")
                    root.destroy()
                    exit()
            final_content = content

            if choice == "1": base = "hw"
            elif choice == "2": base = "num"
            elif choice == "3": base = "help"
            elif choice == "4": base = "rule"
            elif choice == "5": base = "01"
            elif choice == "6": base = "001"
            else: base = choice

            available_folders = get_available_folders()
           
            if available_folders:
                selected_folder = ask_folder_selection(available_folders, f"選擇 {base}.json 的儲存位置")
                if selected_folder is not None:
                    target_folder = selected_folder
                    filename = get_next_filename(base, target_folder)
                else:
                    filename = get_next_filename(base)
            else:
                filename = get_next_filename(base)

# 儲存通用部分
if filename:
    try:
        if target_folder:
            full_path = os.path.join(target_folder, filename)
            os.makedirs(target_folder, exist_ok=True)
        else:
            full_path = filename
            os.makedirs(os.path.dirname(full_path) or '.', exist_ok=True)
       
        with open(full_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(final_content)
       
        root = tk.Tk()
        root.withdraw()
        messagebox.showinfo("儲存成功", f"檔案已儲存：\n{full_path}")
        root.destroy()
       
    except Exception as e:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("儲存失敗", f"無法寫入檔案：\n{full_path if 'full_path' in locals() else filename}\n\n錯誤：{str(e)}")
        root.destroy()
else:
    root = tk.Tk()
    root.withdraw()
    messagebox.showerror("錯誤", "未決定儲存檔名")
    root.destroy()

exit()