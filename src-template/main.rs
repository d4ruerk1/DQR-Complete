use std::thread;
use std::time::Duration;

fn main() {
    println!("DRQ Complete dummy executable active");
    loop {
        thread::sleep(Duration::from_secs(60));
    }
}
