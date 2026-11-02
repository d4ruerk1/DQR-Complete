// Windows entry point wrapper: implementation is in main.cpp.
// Real entry point is configured via /ENTRY:mainEntryPoint in build.rs.
#![no_main]
#![no_std]

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}
