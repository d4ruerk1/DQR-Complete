// Link a freestanding, fully static ELF: no C runtime, no libc.
fn main() {
    for arg in [
        "-nostartfiles",
        "-nostdlib",
        "-static",
        "-Wl,--gc-sections",
        "-Wl,--build-id=none",
        "-Wl,-z,norelro",
    ] {
        println!("cargo:rustc-link-arg-bins={arg}");
    }
}
