#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use eframe::egui;

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([360.0, 200.0]),
        ..Default::default()
    };

    eframe::run_simple_native("DRQ Complete Runner Template", options, move |ctx, _frame| {
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading("DRQ Complete Runner");
            ui.label("Simulated background execution environment");
        });
    })
}
