#include <windows.h>
#include <shellapi.h>

#define ID_BTN_REPO       1002
#define WM_TRAY_MESSAGE   (WM_USER + 1)
#define ID_TRAY_EXIT      1003
#define ID_TRAY_TOGGLE    1004

typedef BOOL(WINAPI* P_Shell_NotifyIconW)(DWORD, PNOTIFYICONDATAW);
typedef HINSTANCE(WINAPI* P_ShellExecuteW)(HWND, LPCWSTR, LPCWSTR, LPCWSTR, LPCWSTR, INT);
typedef HFONT(WINAPI* P_CreateFontW)(int, int, int, int, int, DWORD, DWORD, DWORD, DWORD, DWORD, DWORD, DWORD, DWORD, LPCWSTR);
typedef BOOL(WINAPI* P_DeleteObject)(HGDIOBJ);
typedef HWND(WINAPI* P_CreateWindowExW)(DWORD, LPCWSTR, LPCWSTR, DWORD, int, int, int, int, HWND, HMENU, HINSTANCE, LPVOID);

static P_Shell_NotifyIconW f_Shell_NotifyIconW;
static P_ShellExecuteW f_ShellExecuteW;
static P_CreateFontW f_CreateFontW;
static P_DeleteObject f_DeleteObject;

static wchar_t g_szAppTitle[256] = L"DRQ Complete";
static const wchar_t* REPO_URL = L"https://github.com/d4ruerk1/DQR-Complete";
static NOTIFYICONDATAW g_nid = { 0 };
static HFONT g_hFontHeader = NULL;
static HFONT g_hFontBody = NULL;

static wchar_t* LocateSubstringW(const wchar_t* haystack, const wchar_t* needle) {
    while (*haystack) {
        const wchar_t* h = haystack;
        const wchar_t* n = needle;
        while (*h && *n && *h == *n) {
            h++;
            n++;
        }
        if (!*n) return (wchar_t*)haystack;
        haystack++;
    }
    return NULL;
}

static void ToggleWindowVisibility(HWND hWnd) {
    if (IsWindowVisible(hWnd)) {
        ShowWindow(hWnd, SW_HIDE);
    } else {
        ShowWindow(hWnd, SW_SHOW);
        ShowWindow(hWnd, SW_RESTORE);
        SetForegroundWindow(hWnd);
    }
}

static LRESULT CALLBACK MainWindowProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
    switch (message) {
    case WM_CREATE: {
        g_hFontHeader = f_CreateFontW(20, 0, 0, 0, FW_BOLD, 0, 0, 0, DEFAULT_CHARSET, 0, 0, 0, 0, L"Segoe UI");
        g_hFontBody = f_CreateFontW(16, 0, 0, 0, FW_NORMAL, 0, 0, 0, DEFAULT_CHARSET, 0, 0, 0, 0, L"Segoe UI");

        HWND hTitle = CreateWindowExW(0, L"STATIC", L"DRQ Complete", WS_VISIBLE | WS_CHILD | SS_CENTER, 0, 20, 400, 25, hWnd, NULL, NULL, NULL);
        HWND hTarget = CreateWindowExW(0, L"STATIC", g_szAppTitle, WS_VISIBLE | WS_CHILD | SS_CENTER, 0, 50, 400, 25, hWnd, NULL, NULL, NULL);
        HWND hDesc = CreateWindowExW(0, L"STATIC", L"Active Game Simulation Process", WS_VISIBLE | WS_CHILD | SS_CENTER, 10, 85, 380, 30, hWnd, NULL, NULL, NULL);
        HWND hBtn = CreateWindowExW(0, L"BUTTON", L"View on GitHub", WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON, 130, 135, 140, 32, hWnd, (HMENU)ID_BTN_REPO, NULL, NULL);

        SendMessageW(hTitle, WM_SETFONT, (WPARAM)g_hFontHeader, TRUE);
        SendMessageW(hTarget, WM_SETFONT, (WPARAM)g_hFontBody, TRUE);
        SendMessageW(hDesc, WM_SETFONT, (WPARAM)g_hFontBody, TRUE);
        SendMessageW(hBtn, WM_SETFONT, (WPARAM)g_hFontBody, TRUE);

        g_nid.cbSize = sizeof(NOTIFYICONDATAW);
        g_nid.hWnd = hWnd;
        g_nid.uID = 1;
        g_nid.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
        g_nid.uCallbackMessage = WM_TRAY_MESSAGE;
        g_nid.hIcon = LoadIcon(NULL, IDI_APPLICATION);
        lstrcpynW(g_nid.szTip, g_szAppTitle, 128);
        f_Shell_NotifyIconW(NIM_ADD, &g_nid);
    } break;

    case WM_TRAY_MESSAGE:
        if (lParam == WM_RBUTTONUP) {
            POINT pt;
            GetCursorPos(&pt);
            HMENU hMenu = CreatePopupMenu();
            InsertMenuW(hMenu, 0, MF_BYPOSITION | MF_STRING, ID_TRAY_TOGGLE, IsWindowVisible(hWnd) ? L"Hide" : L"Show");
            InsertMenuW(hMenu, 1, MF_SEPARATOR, 0, NULL);
            InsertMenuW(hMenu, 2, MF_BYPOSITION | MF_STRING, ID_TRAY_EXIT, L"Exit");
            SetForegroundWindow(hWnd);
            TrackPopupMenu(hMenu, TPM_BOTTOMALIGN | TPM_LEFTALIGN, pt.x, pt.y, 0, hWnd, NULL);
            DestroyMenu(hMenu);
        } else if (lParam == WM_LBUTTONDBLCLK) {
            ToggleWindowVisibility(hWnd);
        }
        break;

    case WM_COMMAND:
        if (LOWORD(wParam) == ID_BTN_REPO) {
            f_ShellExecuteW(NULL, L"open", REPO_URL, NULL, NULL, SW_SHOWNORMAL);
        } else if (LOWORD(wParam) == ID_TRAY_EXIT) {
            DestroyWindow(hWnd);
        } else if (LOWORD(wParam) == ID_TRAY_TOGGLE) {
            ToggleWindowVisibility(hWnd);
        }
        break;

    case WM_CTLCOLORSTATIC:
        SetBkMode((HDC)wParam, TRANSPARENT);
        return (LRESULT)GetStockObject(WHITE_BRUSH);

    case WM_DESTROY:
        f_Shell_NotifyIconW(NIM_DELETE, &g_nid);
        if (g_hFontHeader) f_DeleteObject(g_hFontHeader);
        if (g_hFontBody) f_DeleteObject(g_hFontBody);
        PostQuitMessage(0);
        break;

    default:
        return DefWindowProcW(hWnd, message, wParam, lParam);
    }
    return 0;
}

extern "C" {
    #pragma function(memset)
    void* memset(void* dest, int c, size_t count) {
        char* bytes = (char*)dest;
        while (count--) {
            *bytes++ = (char)c;
        }
        return dest;
    }
}

extern "C" void mainEntryPoint() {
    HINSTANCE hInst = GetModuleHandleW(NULL);

    HMODULE hShell32 = LoadLibraryW(L"shell32.dll");
    HMODULE hGdi32 = LoadLibraryW(L"gdi32.dll");
    HMODULE hUser32 = LoadLibraryW(L"user32.dll");

    f_Shell_NotifyIconW = (P_Shell_NotifyIconW)GetProcAddress(hShell32, "Shell_NotifyIconW");
    f_ShellExecuteW = (P_ShellExecuteW)GetProcAddress(hShell32, "ShellExecuteW");
    f_CreateFontW = (P_CreateFontW)GetProcAddress(hGdi32, "CreateFontW");
    f_DeleteObject = (P_DeleteObject)GetProcAddress(hGdi32, "DeleteObject");
    P_CreateWindowExW f_CreateWindowExW = (P_CreateWindowExW)GetProcAddress(hUser32, "CreateWindowExW");

    LPWSTR cmdLine = GetCommandLineW();
    const wchar_t* titleFlag = L"--title";
    wchar_t* match = LocateSubstringW(cmdLine, titleFlag);

    if (match) {
        match += 7;
        while (*match == L' ') match++;

        if (*match == L'"') {
            match++;
            int idx = 0;
            while (*match != L'"' && *match != L'\0' && idx < 255) {
                g_szAppTitle[idx++] = *match++;
            }
            g_szAppTitle[idx] = L'\0';
        } else {
            int idx = 0;
            while (*match != L' ' && *match != L'\0' && idx < 255) {
                g_szAppTitle[idx++] = *match++;
            }
            g_szAppTitle[idx] = L'\0';
        }
    }

    WNDCLASSW wc = { 0 };
    wc.lpfnWndProc = MainWindowProc;
    wc.hInstance = hInst;
    wc.lpszClassName = L"DRQTray";
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    RegisterClassW(&wc);

    HWND hWnd = f_CreateWindowExW(
        0,
        wc.lpszClassName,
        g_szAppTitle,
        WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX,
        CW_USEDEFAULT,
        CW_USEDEFAULT,
        415,
        220,
        NULL,
        NULL,
        hInst,
        NULL
    );

    ShowWindow(hWnd, SW_SHOWNORMAL);

    MSG msg;
    while (GetMessageW(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }
    ExitProcess(0);
}
