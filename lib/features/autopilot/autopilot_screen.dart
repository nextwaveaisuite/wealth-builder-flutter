import 'package:flutter/material.dart';

class AutopilotScreen extends StatelessWidget {
  const AutopilotScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Text('Autopilot', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        SizedBox(height: 8),
        Text('Schedule: Weekly • DCA ON • Radar ON'),
        SizedBox(height: 8),
        Text('Guardrails: Loss Guard weekly brake, safety floor, overweight cap'),
      ],
    );
  }
}